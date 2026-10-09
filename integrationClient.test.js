'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { submitWithRetry, IntegrationError } = require('../src/integrationClient');

// A deliberately flaky mock of assessment-processing, used ONLY to prove the
// retry/backoff and non-retry-on-4xx logic actually works. The real,
// non-mocked integration against the real assessment-processing server is
// in tests/e2e.test.js (requires that project to actually be running —
// see docs/INTEGRATION_TEST_REPORT.md for why both are kept).
function makeMockServer(behavior) {
  let callCount = 0;
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      callCount++;
      const outcome = behavior(callCount, req);
      res.writeHead(outcome.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(outcome.body || {}));
    });
  });
  return { server, getCallCount: () => callCount };
}

test('submitWithRetry succeeds immediately on first 202', async () => {
  const mock = makeMockServer(() => ({ status: 202, body: { submissionId: 'abc', status: 'completed' } }));
  await new Promise((r) => mock.server.listen(0, r));
  const baseUrl = `http://localhost:${mock.server.address().port}`;
  try {
    const result = await submitWithRetry({ baseUrl, apiKey: 'k', idempotencyKey: 'id1', payload: {}, baseDelayMs: 5 });
    assert.equal(result.ok, true);
    assert.equal(result.attempts, 1);
    assert.equal(mock.getCallCount(), 1);
  } finally {
    mock.server.close();
  }
});

test('submitWithRetry retries on 500 then succeeds, using the SAME idempotency key each time', async () => {
  const seenKeys = [];
  const mock = makeMockServer((count, req) => {
    seenKeys.push(req.headers['idempotency-key']);
    if (count < 3) return { status: 500, body: { error: 'boom' } };
    return { status: 202, body: { submissionId: 'abc', status: 'completed' } };
  });
  await new Promise((r) => mock.server.listen(0, r));
  const baseUrl = `http://localhost:${mock.server.address().port}`;
  try {
    const result = await submitWithRetry({ baseUrl, apiKey: 'k', idempotencyKey: 'stable-key', payload: {}, baseDelayMs: 5, maxRetries: 5 });
    assert.equal(result.ok, true);
    assert.equal(mock.getCallCount(), 3);
    assert.deepEqual(new Set(seenKeys), new Set(['stable-key']));
  } finally {
    mock.server.close();
  }
});

test('submitWithRetry does NOT retry on a 422 validation error', async () => {
  const mock = makeMockServer(() => ({ status: 422, body: { error: { code: 'INVALID_SCHEMA' } } }));
  await new Promise((r) => mock.server.listen(0, r));
  const baseUrl = `http://localhost:${mock.server.address().port}`;
  try {
    await assert.rejects(
      () => submitWithRetry({ baseUrl, apiKey: 'k', idempotencyKey: 'id2', payload: {}, baseDelayMs: 5, maxRetries: 5 }),
      IntegrationError
    );
    assert.equal(mock.getCallCount(), 1, 'a 422 must not be retried');
  } finally {
    mock.server.close();
  }
});

test('submitWithRetry gives up after maxRetries and throws', async () => {
  const mock = makeMockServer(() => ({ status: 503, body: {} }));
  await new Promise((r) => mock.server.listen(0, r));
  const baseUrl = `http://localhost:${mock.server.address().port}`;
  try {
    await assert.rejects(() => submitWithRetry({ baseUrl, apiKey: 'k', idempotencyKey: 'id3', payload: {}, baseDelayMs: 5, maxRetries: 2 }));
    assert.equal(mock.getCallCount(), 3); // initial + 2 retries
  } finally {
    mock.server.close();
  }
});
