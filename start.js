#!/usr/bin/env node
'use strict';
const crypto = require('crypto');
const { openDb } = require('../src/db');
const { createServer } = require('../src/server');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const db = openDb(); // file-backed by default (data/assessment.db)

// Deploy-time seeding: lets a hosting platform (Render, etc.) provision a
// working recruiter without anyone running a curl command. Set
// SEED_API_KEY + SEED_RECRUITER_EMAIL (and optionally SEED_RECRUITER_NAME)
// as env vars on both this service AND candidate-assessment (same
// SEED_API_KEY value on both) and this runs once, idempotently, on boot.
function seedRecruiter() {
  const apiKey = process.env.SEED_API_KEY;
  const email = process.env.SEED_RECRUITER_EMAIL;
  if (!apiKey || !email) return;
  const existing = db.prepare('SELECT id FROM recruiters WHERE api_key = ?').get(apiKey);
  if (existing) {
    console.log('seed recruiter already present, skipping.');
    return;
  }
  const id = crypto.randomUUID();
  const name = process.env.SEED_RECRUITER_NAME || 'Recruiter';
  db.prepare('INSERT INTO recruiters (id, name, email, api_key) VALUES (?,?,?,?)').run(id, name, email, apiKey);
  console.log(`seeded recruiter "${name}" <${email}> with the configured SEED_API_KEY.`);
}
seedRecruiter();

const server = createServer(db);
server.listen(PORT, () => {
  console.log(`assessment-processing listening on http://localhost:${PORT}`);
  console.log(`dashboard: http://localhost:${PORT}/dashboard?key=<recruiter api key>`);
  console.log(`create a recruiter manually (if not using SEED_*): POST /internal/recruiters {"name":"...","email":"..."}`);
});

process.on('SIGINT', async () => {
  const { closeBrowser } = require('../src/export');
  await closeBrowser();
  server.close(() => process.exit(0));
});
