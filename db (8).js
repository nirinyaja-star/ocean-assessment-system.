// Local persistence for candidate-assessment. Same reasoning as
// assessment-processing's db.js: node:sqlite (built-in), no Supabase.
// This store exists only to (a) support raw-answer export and (b) track
// delivery status to assessment-processing (idempotency key, retry count) —
// it never stores any OCEAN/Mindset analysis; that stays server-only in
// assessment-processing.
'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function openDb(file = path.join(DATA_DIR, 'candidate.db')) {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_submissions (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT,
      answers_json TEXT NOT NULL,
      assessment_version TEXT NOT NULL,
      question_bank_hash TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending','sending','accepted','failed','retrying')),
      remote_submission_id TEXT,
      remote_status TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

module.exports = { openDb, DATA_DIR };
