'use strict';
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const { openDb } = require('./db');
const registry = require('./questionRegistry');
const { validateSubmission, ValidationError } = require('./validation');
const adapter = require('./engineAdapter');
const { authenticate } = require('./auth');
const { exportReportPdf, exportReportDocx } = require('./export');
const { sendReportEmail } = require('./mailer');
const { renderDashboard } = require('./dashboard');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new ValidationError('PAYLOAD_TOO_LARGE', 'Request body exceeds 2MB.'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new ValidationError('INVALID_JSON', 'Request body is not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html) });
  res.end(html);
}

function sendFile(res, status, filePath, contentType) {
  const fs = require('fs');
  const data = fs.readFileSync(filePath);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${require('path').basename(filePath)}"`,
    'Content-Length': data.length,
  });
  res.end(data);
}

function errorBody(err) {
  if (err instanceof ValidationError) return { error: { code: err.code, message: err.message, details: err.details } };
  return { error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } };
}

/** Builds the HTTP server. db is injected so tests can use an in-memory DB. */
function createServer(db) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);

      // -- Health --
      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { status: 'ok', assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH });
      }

      // -- Public: question registry (so candidate-assessment can self-check drift) --
      if (req.method === 'GET' && url.pathname === '/api/v1/question-registry') {
        return sendJson(res, 200, { assessmentVersion: registry.ASSESSMENT_VERSION, questionBankHash: registry.QUESTION_BANK_HASH, questions: registry.publicQuestionList() });
      }

      // -- Dashboard (server-rendered HTML; no auth header needed, cookie-less demo auth via ?key=) --
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/dashboard'))) {
        const apiKey = url.searchParams.get('key');
        const recruiter = apiKey ? db.prepare('SELECT * FROM recruiters WHERE api_key = ?').get(apiKey) : null;
        const html = renderDashboard(db, url, recruiter);
        return sendHtml(res, 200, html);
      }

      // Everything under /api requires a Bearer API key.
      if (parts[0] === 'api') {
        const recruiter = authenticate(req, db);
        if (!recruiter) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key.' } });
        req.recruiter = recruiter;
      }

      // -- POST /api/v1/submissions --
      if (req.method === 'POST' && url.pathname === '/api/v1/submissions') {
        const idempotencyKey = req.headers['idempotency-key'];
        if (!idempotencyKey) return sendJson(res, 400, { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency-Key header is required.' } });

        const rawBody = await readJsonBody(req);
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(rawBody)).digest('hex');

        // Idempotency check
        const existingKey = db.prepare('SELECT * FROM idempotency_keys WHERE recruiter_id = ? AND idempotency_key = ?').get(req.recruiter.id, idempotencyKey);
        if (existingKey) {
          if (existingKey.request_hash !== requestHash) {
            return sendJson(res, 409, { error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'This Idempotency-Key was already used with a different request body.' } });
          }
          const existingSub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(existingKey.submission_id);
          return sendJson(res, 202, { submissionId: existingSub.id, status: existingSub.status, replay: true });
        }

        let validated;
        try {
          validated = validateSubmission(rawBody);
        } catch (e) {
          return sendJson(res, 422, errorBody(e));
        }

        const candidateId = crypto.randomUUID();
        db.prepare('INSERT INTO candidates (id, recruiter_id, name, email, code) VALUES (?,?,?,?,?)').run(
          candidateId, req.recruiter.id, validated.candidate.name, validated.candidate.email, validated.candidate.code
        );

        const submissionId = crypto.randomUUID();
        db.prepare(
          `INSERT INTO submissions (id, idempotency_key, recruiter_id, candidate_id, job_id, assessment_version, question_bank_hash, answers_json, status, source_system)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).run(
          submissionId, idempotencyKey, req.recruiter.id, candidateId, validated.jobId,
          validated.assessmentVersion, validated.questionBankHash, JSON.stringify(validated.answers), 'received', validated.sourceSystem
        );
        db.prepare('INSERT INTO idempotency_keys (recruiter_id, idempotency_key, submission_id, request_hash) VALUES (?,?,?,?)').run(
          req.recruiter.id, idempotencyKey, submissionId, requestHash
        );
        db.prepare('INSERT INTO audit_log (id, recruiter_id, submission_id, action, detail) VALUES (?,?,?,?,?)').run(
          crypto.randomUUID(), req.recruiter.id, submissionId, 'submission_received', validated.sourceSystem
        );

        // Process synchronously (no queue infra available) but still move
        // through the documented status state machine so the behavior
        // matches the spec, even though it all happens within one request.
        processSubmission(db, submissionId);

        const final = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
        return sendJson(res, 202, { submissionId, status: final.status, statusReason: final.status_reason || null });
      }

      // -- GET /api/v1/submissions/:id --
      if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'submissions' && parts[3] && !parts[4]) {
        const sub = db.prepare('SELECT * FROM submissions WHERE id = ? AND recruiter_id = ?').get(parts[3], req.recruiter.id);
        if (!sub) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Submission not found.' } });
        return sendJson(res, 200, { id: sub.id, status: sub.status, statusReason: sub.status_reason, createdAt: sub.created_at, updatedAt: sub.updated_at });
      }

      // -- GET /api/v1/submissions/:id/report --
      if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'submissions' && parts[3] && parts[4] === 'report') {
        const sub = db.prepare('SELECT * FROM submissions WHERE id = ? AND recruiter_id = ?').get(parts[3], req.recruiter.id);
        if (!sub) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Submission not found.' } });
        if (sub.status !== 'completed') return sendJson(res, 409, { error: { code: 'REPORT_NOT_READY', message: `Submission status is "${sub.status}".` } });
        const rep = db.prepare('SELECT * FROM reports WHERE submission_id = ?').get(sub.id);
        return sendJson(res, 200, JSON.parse(rep.report_json));
      }

      // -- GET /api/v1/submissions/:id/export?format=pdf|docx --
      if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'submissions' && parts[3] && parts[4] === 'export') {
        const sub = db.prepare('SELECT * FROM submissions WHERE id = ? AND recruiter_id = ?').get(parts[3], req.recruiter.id);
        if (!sub) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Submission not found.' } });
        if (sub.status !== 'completed') return sendJson(res, 409, { error: { code: 'REPORT_NOT_READY', message: `Submission status is "${sub.status}".` } });
        const format = url.searchParams.get('format') === 'docx' ? 'docx' : 'pdf';
        const rep = db.prepare('SELECT * FROM reports WHERE submission_id = ?').get(sub.id);
        const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(sub.candidate_id);
        const report = JSON.parse(rep.report_json);
        const filePath = format === 'pdf'
          ? await exportReportPdf(report, candidate, sub.id)
          : await exportReportDocx(report, candidate, sub.id);
        db.prepare('INSERT INTO exports (id, submission_id, format, file_path) VALUES (?,?,?,?)').run(crypto.randomUUID(), sub.id, format, filePath);
        return sendFile(res, 200, filePath, format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }

      // -- POST /api/v1/jobs (JD text upload + parse) --
      if (req.method === 'POST' && url.pathname === '/api/v1/jobs') {
        const body = await readJsonBody(req);
        if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
          return sendJson(res, 422, { error: { code: 'INVALID_SCHEMA', message: 'text is required.' } });
        }
        const parsed = adapter.parseJD(body.text);
        const jobId = crypto.randomUUID();
        db.prepare('INSERT INTO jobs (id, recruiter_id, title, jd_version, raw_text, parsed_json) VALUES (?,?,?,?,?,?)').run(
          jobId, req.recruiter.id, body.title || parsed.title || 'Untitled', body.jdVersion || 'JD-1.0', body.text, JSON.stringify(parsed)
        );
        return sendJson(res, 201, { jobId, parsed });
      }

      // -- POST /api/v1/submissions/:id/send-email --
      if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'submissions' && parts[3] && parts[4] === 'send-email') {
        const sub = db.prepare('SELECT * FROM submissions WHERE id = ? AND recruiter_id = ?').get(parts[3], req.recruiter.id);
        if (!sub) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Submission not found.' } });
        if (sub.status !== 'completed') return sendJson(res, 409, { error: { code: 'REPORT_NOT_READY', message: `Submission status is "${sub.status}".` } });
        const result = sendReportEmail({
          toAddress: req.recruiter.email,
          subject: `[AI-Assisted] Candidate report ${sub.id}`,
          bodyText: 'ดูรายงานฉบับเต็มในแดชบอร์ด (ไฟล์นี้เป็นบันทึกการทดสอบระบบ ไม่ได้ถูกส่งจริง)',
          submissionId: sub.id,
        });
        db.prepare('INSERT INTO email_log (id, submission_id, to_address, subject, mode, status, file_path, error) VALUES (?,?,?,?,?,?,?,?)').run(
          crypto.randomUUID(), sub.id, req.recruiter.email, `[AI-Assisted] Candidate report ${sub.id}`, result.mode,
          result.status === 'accepted' ? 'accepted' : 'failed', result.filePath || null, result.error || null
        );
        return sendJson(res, result.status === 'accepted' ? 202 : 502, result);
      }

      // -- Admin/test helper: create a recruiter (not part of the public API contract) --
      if (req.method === 'POST' && url.pathname === '/internal/recruiters') {
        const body = await readJsonBody(req);
        const { generateApiKey } = require('./auth');
        const id = crypto.randomUUID();
        const apiKey = generateApiKey();
        db.prepare('INSERT INTO recruiters (id, name, email, api_key) VALUES (?,?,?,?)').run(id, body.name || 'Recruiter', body.email || `${id}@example.com`, apiKey);
        return sendJson(res, 201, { id, apiKey });
      }

      return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'No such route.' } });
    } catch (err) {
      return sendJson(res, 500, errorBody(err));
    }
  });
}

/**
 * Runs the submission through validating -> processing -> completed|failed.
 * Synchronous in this sandbox (no queue/worker infra available), but keeps
 * the exact state machine the spec asked for so the contract is faithful.
 */
function processSubmission(db, submissionId) {
  const mark = (status, reason) => {
    db.prepare("UPDATE submissions SET status=?, status_reason=?, updated_at=datetime('now') WHERE id=?").run(status, reason || null, submissionId);
  };
  mark('validating');
  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(sub.candidate_id);
  let jd = null;
  if (sub.job_id) {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(sub.job_id);
    jd = job ? job.raw_text : null;
  }
  mark('processing');
  try {
    const answers = JSON.parse(sub.answers_json);
    const report = adapter.buildReport(answers, jd, { candidateName: candidate.name, candidateCode: candidate.code });
    db.prepare('INSERT INTO reports (id, submission_id, report_json) VALUES (?,?,?)').run(crypto.randomUUID(), submissionId, JSON.stringify(report));
    mark('completed');
  } catch (err) {
    mark('failed', String(err && err.message ? err.message : err));
  }
}

module.exports = { createServer, processSubmission };
