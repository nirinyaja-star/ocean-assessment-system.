'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../src/db');
const { createServer } = require('../src/server');
const { closeBrowser } = require('../src/export');
const registry = require('../src/questionRegistry');

let server, base, db;

test.before(async () => {
  db = openDb(':memory:');
  server = createServer(db);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

test.after(async () => {
  await closeBrowser();
  await new Promise((resolve) => server.close(resolve));
});

async function createRecruiter(name = 'Test Recruiter', email) {
  const r = await fetch(`${base}/internal/recruiters`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, email: email || `${crypto.randomUUID()}@example.com` }),
  });
  return r.json();
}

function flattenKeys(obj, out = {}) {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      out[k] = true;
      flattenKeys(v, out);
    }
  }
  return out;
}

function fullAnswers(fn) {
  const answers = {};
  registry.listQuestionIds().forEach((id, i) => {
    answers[id] = fn ? fn(id, i) : i % 4;
  });
  return answers;
}

test('health endpoint reports real question bank hash', async () => {
  const r = await fetch(`${base}/health`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.questionBankHash, registry.QUESTION_BANK_HASH);
  assert.equal(body.assessmentVersion, registry.ASSESSMENT_VERSION);
});

test('question registry endpoint exposes all 50 questions, no indicator/construct leak', async () => {
  const r = await fetch(`${base}/api/v1/question-registry`);
  const body = await r.json();
  assert.equal(body.questions.length, 50);
  const json = JSON.stringify(body);
  assert.ok(!/indicator/i.test(json), 'public question list must not leak indicator mapping');
});

test('unauthenticated request to a protected route is rejected', async () => {
  const r = await fetch(`${base}/api/v1/submissions/does-not-exist`);
  assert.equal(r.status, 401);
});

test('wrong API key is rejected', async () => {
  const r = await fetch(`${base}/api/v1/submissions/x`, { headers: { authorization: 'Bearer sk_bogus' } });
  assert.equal(r.status, 401);
});

test('submission missing Idempotency-Key header is rejected', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({}),
  });
  assert.equal(r.status, 400);
  const body = await r.json();
  assert.equal(body.error.code, 'MISSING_IDEMPOTENCY_KEY');
});

test('submission with invalid schema returns 422 INVALID_SCHEMA', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'k1' },
    body: JSON.stringify({ candidate: {} }),
  });
  assert.equal(r.status, 422);
  const body = await r.json();
  assert.equal(body.error.code, 'INVALID_SCHEMA');
});

test('submission with unknown questionId returns 422 UNKNOWN_QUESTION_ID', async () => {
  const { apiKey } = await createRecruiter();
  const answers = fullAnswers();
  answers['ocean:999'] = 0;
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'k2' },
    body: JSON.stringify({ candidate: { name: 'A' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers }),
  });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error.code, 'UNKNOWN_QUESTION_ID');
});

test('submission with mismatched questionBankHash returns 422 QUESTION_BANK_MISMATCH', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'k3' },
    body: JSON.stringify({ candidate: { name: 'A' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: 'deadbeef', answers: fullAnswers() }),
  });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error.code, 'QUESTION_BANK_MISMATCH');
});

test('incomplete submission returns 422 INCOMPLETE_SUBMISSION', async () => {
  const { apiKey } = await createRecruiter();
  const answers = fullAnswers();
  delete answers['ocean:1'];
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'k4' },
    body: JSON.stringify({ candidate: { name: 'A' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers }),
  });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error.code, 'INCOMPLETE_SUBMISSION');
});

test('valid full submission completes and produces a report with zero forbidden scoring/ranking language', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'k5' },
    body: JSON.stringify({ candidate: { name: 'ผู้สมัคร ทดสอบ' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  assert.equal(r.status, 202);
  const { submissionId, status } = await r.json();
  assert.equal(status, 'completed');

  const rr = await fetch(`${base}/api/v1/submissions/${submissionId}/report`, { headers: { authorization: `Bearer ${apiKey}` } });
  assert.equal(rr.status, 200);
  const report = await rr.json();
  const flat = JSON.stringify(report).toLowerCase();
  // 'score' / 'คะแนน' deliberately NOT checked as bare substrings: the
  // disclaimer itself legitimately uses "คะแนน" inside the sentence telling
  // the reader NOT to combine OCEAN and Mindset into one score — a naive
  // substring ban flags that correct, protective sentence as a violation.
  // What actually matters is checked precisely instead: no numeric
  // score/ranking FIELDS anywhere in the JSON.
  for (const forbidden of ['fit %', 'hire', 'reject', 'pass/fail', 'ranking', 'fitscore', 'totalscore']) {
    assert.ok(!flat.includes(forbidden.toLowerCase()), `report must not contain forbidden term "${forbidden}"`);
  }
  const keyNames = JSON.stringify(Object.keys(flattenKeys(report)));
  assert.ok(!/\b(score|totalScore|fitScore|percentage|rank)\b/i.test(keyNames), 'report must not expose a score/rank/percentage field');
  assert.equal(report.oceanProfile.coreBehavioralProfile.length > 0, true);
});

test('idempotent replay with same key+body returns same submissionId, does not create a second candidate row', async () => {
  const { apiKey } = await createRecruiter();
  const payload = JSON.stringify({ candidate: { name: 'Replay Test' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() });
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'replay-key-1' };

  const r1 = await fetch(`${base}/api/v1/submissions`, { method: 'POST', headers, body: payload });
  const b1 = await r1.json();
  const r2 = await fetch(`${base}/api/v1/submissions`, { method: 'POST', headers, body: payload });
  const b2 = await r2.json();

  assert.equal(b1.submissionId, b2.submissionId);
  assert.equal(b2.replay, true);

  const count = db.prepare('SELECT COUNT(*) as c FROM submissions WHERE id = ?').get(b1.submissionId).c;
  assert.equal(count, 1);
});

test('reusing an Idempotency-Key with a different body returns 409 IDEMPOTENCY_KEY_REUSED', async () => {
  const { apiKey } = await createRecruiter();
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'reuse-key-1' };
  await fetch(`${base}/api/v1/submissions`, {
    method: 'POST', headers,
    body: JSON.stringify({ candidate: { name: 'A' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  const r2 = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST', headers,
    body: JSON.stringify({ candidate: { name: 'B (different!)' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  assert.equal(r2.status, 409);
  assert.equal((await r2.json()).error.code, 'IDEMPOTENCY_KEY_REUSED');
});

test('a recruiter cannot read another recruiter\'s submission (app-level tenant isolation)', async () => {
  const recA = await createRecruiter('Recruiter A');
  const recB = await createRecruiter('Recruiter B');
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${recA.apiKey}`, 'idempotency-key': 'tenant-1' },
    body: JSON.stringify({ candidate: { name: 'Tenant Test' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  const { submissionId } = await r.json();
  const rCross = await fetch(`${base}/api/v1/submissions/${submissionId}`, { headers: { authorization: `Bearer ${recB.apiKey}` } });
  assert.equal(rCross.status, 404, 'cross-tenant read must not succeed');
});

test('report export (PDF) returns a non-trivial PDF with correct content-type', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'export-pdf-1' },
    body: JSON.stringify({ candidate: { name: 'Export Test' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  const { submissionId } = await r.json();
  const rPdf = await fetch(`${base}/api/v1/submissions/${submissionId}/export?format=pdf`, { headers: { authorization: `Bearer ${apiKey}` } });
  assert.equal(rPdf.status, 200);
  assert.equal(rPdf.headers.get('content-type'), 'application/pdf');
  const buf = Buffer.from(await rPdf.arrayBuffer());
  assert.ok(buf.length > 5000, 'PDF should be a real, non-trivial file');
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
});

test('report export (DOCX) returns a valid zip (docx) file', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'export-docx-1' },
    body: JSON.stringify({ candidate: { name: 'Export Test 2' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  const { submissionId } = await r.json();
  const rDocx = await fetch(`${base}/api/v1/submissions/${submissionId}/export?format=docx`, { headers: { authorization: `Bearer ${apiKey}` } });
  assert.equal(rDocx.status, 200);
  const buf = Buffer.from(await rDocx.arrayBuffer());
  assert.equal(buf.subarray(0, 2).toString(), 'PK', 'docx is a zip file, must start with PK magic bytes');
});

test('JD upload + parse endpoint returns structured jobContext', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ title: 'วิศวกร', text: 'ตำแหน่ง: วิศวกร\nต้องการ: ใช้ Excel และ AutoCAD' }),
  });
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.ok(body.jobId);
  assert.ok(Array.isArray(body.parsed.technicalRequirements));
});

test('send-email endpoint runs in test mode and writes an .eml file, never claims a live send', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': 'email-1' },
    body: JSON.stringify({ candidate: { name: 'Email Test' }, assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, answers: fullAnswers() }),
  });
  const { submissionId } = await r.json();
  const rEmail = await fetch(`${base}/api/v1/submissions/${submissionId}/send-email`, { method: 'POST', headers: { authorization: `Bearer ${apiKey}` } });
  assert.equal(rEmail.status, 202);
  const body = await rEmail.json();
  assert.equal(body.mode, 'test');
  assert.ok(require('fs').existsSync(body.filePath), 'the .eml file claimed must actually exist on disk');
});

test('dashboard renders submission list for an authenticated recruiter', async () => {
  const { apiKey } = await createRecruiter();
  const r = await fetch(`${base}/dashboard?key=${apiKey}`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(html.includes('รายการผู้สมัคร'));
});
