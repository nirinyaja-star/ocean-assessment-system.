// Persistence layer. Spec called for Supabase/Postgres with RLS; this
// sandbox cannot npm-install the Supabase client or reach a Postgres
// instance over the network. node:sqlite is Node's own built-in module
// (no install required) — see docs/ARCHITECTURE_DECISION.md for the full
// rationale and the stated limitation (no engine-level RLS; access control
// is enforced in application code in src/auth.js instead).
'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function openDb(file = path.join(DATA_DIR, 'assessment.db')) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS recruiters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      recruiter_id TEXT NOT NULL REFERENCES recruiters(id),
      title TEXT NOT NULL,
      jd_version TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      parsed_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      recruiter_id TEXT NOT NULL REFERENCES recruiters(id),
      name TEXT NOT NULL,
      email TEXT,
      code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      recruiter_id TEXT NOT NULL REFERENCES recruiters(id),
      candidate_id TEXT NOT NULL REFERENCES candidates(id),
      job_id TEXT REFERENCES jobs(id),
      assessment_version TEXT NOT NULL,
      question_bank_hash TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received','validating','processing','completed','failed','needs_review')),
      status_reason TEXT,
      source_system TEXT NOT NULL DEFAULT 'unknown',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(recruiter_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id),
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id),
      format TEXT NOT NULL CHECK (format IN ('pdf','docx')),
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id),
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('test','live')),
      status TEXT NOT NULL CHECK (status IN ('pending','sending','accepted','failed','retrying')),
      file_path TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      recruiter_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      submission_id TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (recruiter_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      recruiter_id TEXT,
      submission_id TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

module.exports = { openDb, DATA_DIR };
