'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { openDb } = require('../src/db');
const { createServer } = require('../src/server');
const { closeBrowser } = require('../src/rawExport');
const registry = require('../src/questionRegistry');

let appServer, mockProcessing, base, db;

test.before(async () => {
  // Mock assessment-processing: accepts anything shaped right, always 202.
  mockProcessing = http.createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ submissionId: 'remote-' + req.headers['idempotency-key'], status: 'completed' }));
    });
  });
  await new Promise((r) => mockProcessing.listen(0, r));
  const processingBase = `http://localhost:${mockProcessing.address().port}`;

  db = openDb(':memory:');
  appServer = createServer(db, { baseUrl: processingBase, apiKey: 'test-key' });
  await new Promise((r) => appServer.listen(0, r));
  base = `http://localhost:${appServer.address().port}`;
});

test.after(async () => {
  await closeBrowser();
  await new Promise((r) => appServer.close(r));
  await new Promise((r) => mockProcessing.close(r));
});

function fullAnswers() {
  const a = {};
  registry.listQuestionIds().forEach((id, i) => (a[id] = i % 4));
  return a;
}

test('serves the candidate SPA and its question bank', async () => {
  const r1 = await fetch(`${base}/`);
  assert.equal(r1.status, 200);
  const r2 = await fetch(`${base}/questions.json`);
  const body = await r2.json();
  assert.equal(body.questions.length, 50);
});

test('rejects an incomplete submission before ever calling assessment-processing', async () => {
  const answers = fullAnswers();
  delete answers['ocean:1'];
  const r = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidateName: 'Test', answers }),
  });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error.code, 'INCOMPLETE_SUBMISSION');
});

test('accepts a full submission, forwards it, and stores the remote result', async () => {
  const r = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidateName: 'ผู้สมัคร หนึ่ง', candidateEmail: 'a@b.com', answers: fullAnswers() }),
  });
  assert.equal(r.status, 202);
  const body = await r.json();
  assert.ok(body.localId);
  assert.ok(body.remoteSubmissionId.startsWith('remote-'));

  const statusRes = await fetch(`${base}/api/local-submissions/${body.localId}`);
  const statusBody = await statusRes.json();
  assert.equal(statusBody.delivery_status, 'accepted');
});

test('raw export (JSON) contains question text + selected option text, nothing analyzed', async () => {
  const r = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidateName: 'Export Test', answers: fullAnswers() }),
  });
  const { localId } = await r.json();
  const exportRes = await fetch(`${base}/api/export/${localId}?format=json`);
  const exportBody = await exportRes.json();
  assert.equal(exportBody.answers.length, 50);
  const flat = JSON.stringify(exportBody).toLowerCase();
  for (const forbidden of ['indicator', 'theme', 'pattern', 'reasoning', 'construct']) {
    assert.ok(!flat.includes(forbidden), `raw export must not leak analysis field "${forbidden}"`);
  }
});

test('raw export (CSV) has UTF-8 BOM and escapes a formula-injection attempt', async () => {
  const r = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidateName: '=cmd|\' /C calc\'!A1', answers: fullAnswers() }),
  });
  const { localId } = await r.json();
  const csvRes = await fetch(`${base}/api/export/${localId}?format=csv`);
  // Use raw bytes, not .text(): the Fetch spec's UTF-8 decoder strips a
  // leading BOM on decode, so checking the decoded string would pass even
  // if the server sent no BOM at all — this caught that test-design bug.
  const buf = Buffer.from(await csvRes.arrayBuffer());
  assert.equal(buf[0], 0xef);
  assert.equal(buf[1], 0xbb);
  assert.equal(buf[2], 0xbf);
  const csv = buf.toString('utf8');
  assert.ok(csv.includes("'=cmd"), 'formula-injection payload must be neutralized with a leading quote');
});

test('raw export PDF and DOCX are real binary files', async () => {
  const r = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidateName: 'Binary Export Test', answers: fullAnswers() }),
  });
  const { localId } = await r.json();
  const pdfRes = await fetch(`${base}/api/export/${localId}?format=pdf`);
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  assert.equal(pdfBuf.subarray(0, 5).toString(), '%PDF-');

  const docxRes = await fetch(`${base}/api/export/${localId}?format=docx`);
  const docxBuf = Buffer.from(await docxRes.arrayBuffer());
  assert.equal(docxBuf.subarray(0, 2).toString(), 'PK');
});
