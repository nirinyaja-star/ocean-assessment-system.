// Application-level access control, standing in for Postgres RLS (see
// docs/ARCHITECTURE_DECISION.md — this is the known limitation: enforced
// here in code, not by the database engine).
'use strict';
const crypto = require('crypto');

function generateApiKey() {
  return 'sk_' + crypto.randomBytes(24).toString('hex');
}

/** Reads "Authorization: Bearer <key>" and resolves it to a recruiter row, or null. */
function authenticate(req, db) {
  const header = req.headers['authorization'] || '';
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match) return null;
  const apiKey = match[1].trim();
  const row = db.prepare('SELECT * FROM recruiters WHERE api_key = ?').get(apiKey);
  return row || null;
}

module.exports = { generateApiKey, authenticate };
