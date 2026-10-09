'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const registry = require('./questionRegistry');
const { validateAnswers, ValidationError } = require('./validation');
const { submitWithRetry, IntegrationError } = require('./integrationClient');
const rawExport = require('./rawExport');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };

function serveStatic(res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? '/index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: { code: 'FORBIDDEN' } });
  if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: { code: 'NOT_FOUND' } });
  const ext = path.extname(filePath);
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': data.length });
  res.end(data);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new ValidationError('INVALID_JSON', 'Body is not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * @param {object} db node:sqlite handle (injected so tests can use :memory:)
 * @param {{baseUrl:string, apiKey:string}} integrationConfig where/how to reach assessment-processing
 */
function createServer(db, integrationConfig) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { status: 'ok', assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH });
      }

      if (req.method === 'POST' && url.pathname === '/api/submit') {
        const body = await readJsonBody(req);
        const { candidateName, candidateEmail, answers } = body;
        if (!candidateName || typeof candidateName !== 'string' || !candidateName.trim()) {
          return sendJson(res, 422, { error: { code: 'INVALID_SCHEMA', message: 'candidateName is required.' } });
        }
        try {
          validateAnswers(answers);
        } catch (e) {
          return sendJson(res, 422, { error: { code: e.code, message: e.message, details: e.details } });
        }

        const localId = crypto.randomUUID();
        const idempotencyKey = `candidate-assessment:${localId}`;
        db.prepare(
          `INSERT INTO local_submissions (id, idempotency_key, candidate_name, candidate_email, answers_json, assessment_version, question_bank_hash, delivery_status)
           VALUES (?,?,?,?,?,?,?,?)`
        ).run(localId, idempotencyKey, candidateName.trim(), candidateEmail || null, JSON.stringify(answers), registry.ASSESSMENT_VERSION, registry.QUESTION_BANK_HASH, 'sending');

        try {
          const result = await submitWithRetry({
            baseUrl: integrationConfig.baseUrl,
            apiKey: integrationConfig.apiKey,
            idempotencyKey,
            payload: {
              candidate: { name: candidateName.trim(), email: candidateEmail || null },
              assessmentVersion: registry.ASSESSMENT_VERSION,
              questionBankHash: registry.QUESTION_BANK_HASH,
              answers,
              sourceSystem: 'candidate-assessment',
            },
          });
          db.prepare(
            `UPDATE local_submissions SET delivery_status='accepted', remote_submission_id=?, remote_status=?, updated_at=datetime('now') WHERE id=?`
          ).run(result.body.submissionId, result.body.status, localId);
          return sendJson(res, 202, { localId, remoteSubmissionId: result.body.submissionId, remoteStatus: result.body.status });
        } catch (e) {
          const msg = e instanceof IntegrationError ? e.message : String(e);
          db.prepare(`UPDATE local_submissions SET delivery_status='failed', last_error=?, retry_count=retry_count+1, updated_at=datetime('now') WHERE id=?`).run(msg, localId);
          return sendJson(res, 502, { localId, error: { code: 'DELIVERY_FAILED', message: msg } });
        }
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/export/')) {
        const localId = url.pathname.split('/')[3];
        const format = url.searchParams.get('format') || 'json';
        const row = db.prepare('SELECT * FROM local_submissions WHERE id = ?').get(localId);
        if (!row) return sendJson(res, 404, { error: { code: 'NOT_FOUND' } });
        const answers = JSON.parse(row.answers_json);
        const meta = { candidateName: row.candidate_name, assessmentVersion: row.assessment_version };
        if (format === 'json') return sendJson(res, 200, JSON.parse(rawExport.toJson(answers, meta)));
        if (format === 'csv') {
          const csv = rawExport.toCsv(answers, meta);
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="answers-${localId}.csv"` });
          return res.end(csv);
        }
        if (format === 'docx') {
          const buf = await rawExport.toDocx(answers, meta);
          res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="answers-${localId}.docx"` });
          return res.end(buf);
        }
        if (format === 'pdf') {
          const buf = await rawExport.toPdf(answers, meta);
          res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="answers-${localId}.pdf"` });
          return res.end(buf);
        }
        return sendJson(res, 400, { error: { code: 'UNKNOWN_FORMAT' } });
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/local-submissions/')) {
        const localId = url.pathname.split('/')[3];
        const row = db.prepare('SELECT id, delivery_status, remote_submission_id, remote_status, retry_count, last_error FROM local_submissions WHERE id = ?').get(localId);
        if (!row) return sendJson(res, 404, { error: { code: 'NOT_FOUND' } });
        return sendJson(res, 200, row);
      }

      if (req.method === 'GET') return serveStatic(res, url.pathname);

      return sendJson(res, 404, { error: { code: 'NOT_FOUND' } });
    } catch (err) {
      return sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: String(err && err.message ? err.message : err) } });
    }
  });
}

module.exports = { createServer };
