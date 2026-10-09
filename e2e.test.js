'use strict';
// TRUE end-to-end test: starts a REAL assessment-processing server (the
// actual Project 01 code, not a mock) and a REAL candidate-assessment
// server (Project 02), then drives the ACTUAL candidate SPA in a real
// headless Chromium browser (Playwright, already installed in this
// sandbox) through all 50 questions, submits, and confirms the real
// report was generated server-side on the real Project 01 instance. This
// is the "run them together, for real" test the two projects' specs (and
// the user) asked for — nothing here is mocked.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const processingDb = require(path.join(__dirname, '..', '..', 'assessment-processing', 'src', 'db'));
const processingServerMod = require(path.join(__dirname, '..', '..', 'assessment-processing', 'src', 'server'));
const processingExport = require(path.join(__dirname, '..', '..', 'assessment-processing', 'src', 'export'));

const { openDb: openCandidateDb } = require('../src/db');
const { createServer: createCandidateServer } = require('../src/server');
const { closeBrowser: closeCandidateBrowser } = require('../src/rawExport');
const { writeQuestionsJson } = require('../src/exportQuestions');

let processingServer, candidateServer, processingBase, candidateBase, apiKey, pDb, cDb, browser;

test.before(async () => {
  writeQuestionsJson();

  pDb = processingDb.openDb(':memory:');
  processingServer = processingServerMod.createServer(pDb);
  await new Promise((r) => processingServer.listen(0, r));
  processingBase = `http://localhost:${processingServer.address().port}`;

  const r = await fetch(`${processingBase}/internal/recruiters`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Recruiter', email: 'e2e@example.com' }),
  });
  const recruiter = await r.json();
  apiKey = recruiter.apiKey;

  cDb = openCandidateDb(':memory:');
  candidateServer = createCandidateServer(cDb, { baseUrl: processingBase, apiKey });
  await new Promise((r2) => candidateServer.listen(0, r2));
  candidateBase = `http://localhost:${candidateServer.address().port}`;

  const { chromium } = require('playwright');
  browser = await chromium.launch();
});

test.after(async () => {
  await browser.close();
  await processingExport.closeBrowser();
  await closeCandidateBrowser();
  await new Promise((r) => processingServer.close(r));
  await new Promise((r) => candidateServer.close(r));
});

test('a real candidate click-through in a real browser produces a real, completed, evidence-backed report on the real Project 01 server', async () => {
  const page = await browser.newPage();
  await page.goto(candidateBase + '/');

  await page.fill('#name', 'สมชาย ทดสอบจริง');
  await page.fill('#email', 'somchai@example.com');
  await page.click('button:has-text("เริ่มทำแบบประเมิน")');

  // Click through all 50 questions, always picking the first option, via
  // the real UI (real radio inputs, real onchange handlers, real nav
  // buttons) — not by poking state directly.
  for (let i = 0; i < 50; i++) {
    await page.waitForSelector('input[type=radio]');
    await page.click('input[type=radio]:nth-of-type(1)');
    const isLast = i === 49;
    await page.click(isLast ? 'button:has-text("ตรวจสอบคำตอบทั้งหมด")' : 'button:has-text("ถัดไป")');
  }

  await page.waitForSelector('text=ตรวจสอบคำตอบก่อนส่ง');
  const missingWarning = await page.locator('text=ยังตอบไม่ครบ').count();
  assert.equal(missingWarning, 0, 'all 50 questions should have been answered by the click-through loop');

  await page.click('button:has-text("ส่งคำตอบ")');
  await page.waitForSelector('text=ส่งคำตอบสำเร็จ', { timeout: 10000 });

  const refText = await page.locator('text=หมายเลขอ้างอิง').textContent();
  const localId = refText.split(':').pop().trim();
  assert.ok(localId && localId !== '-', 'a real localId should be shown');

  // Confirm against candidate-assessment's own record of delivery.
  const statusRes = await fetch(`${candidateBase}/api/local-submissions/${localId}`);
  const statusBody = await statusRes.json();
  assert.equal(statusBody.delivery_status, 'accepted');
  const remoteSubmissionId = statusBody.remote_submission_id;
  assert.ok(remoteSubmissionId);

  // Confirm directly against the REAL Project 01 server that a real report exists.
  const reportRes = await fetch(`${processingBase}/api/v1/submissions/${remoteSubmissionId}/report`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  assert.equal(reportRes.status, 200);
  const report = await reportRes.json();
  assert.ok(report.oceanProfile.coreBehavioralProfile.length > 0, 'real evidence-backed OCEAN patterns were generated');
  assert.ok(report.mindsetProfile.length === 5, 'all 5 Work Mindset dimensions present');

  // And confirm the candidate's own raw-export download link (shown on the
  // real "done" screen) actually serves a real PDF through the real UI.
  const pdfLink = await page.locator('a:has-text("ดาวน์โหลดคำตอบของฉัน")').getAttribute('href');
  const pdfRes = await fetch(candidateBase + pdfLink);
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  assert.equal(pdfBuf.subarray(0, 5).toString(), '%PDF-');

  await page.close();
});
