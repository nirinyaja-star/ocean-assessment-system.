// Spec: Resend, with "test-mode if no API key". This sandbox has no
// RESEND_API_KEY and, separately, no verified outbound path to any SMTP/
// email-API host either way (never tested, by design — see
// docs/ARCHITECTURE_DECISION.md). So this always runs in test mode: it
// writes a real .eml-style file to disk and logs the attempt to
// email_log, and is honest about never having sent a real email.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_DIR = path.join(__dirname, '..', 'data', 'email_out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function isTestMode() {
  return !process.env.RESEND_API_KEY;
}

/**
 * @returns {{status:'accepted'|'failed', mode:'test'|'live', filePath?:string, error?:string}}
 */
function sendReportEmail({ toAddress, subject, bodyText, submissionId }) {
  if (isTestMode()) {
    const id = crypto.randomUUID();
    const filePath = path.join(OUT_DIR, `${id}.eml`);
    const eml = `To: ${toAddress}\r\nSubject: ${subject}\r\nX-Submission-Id: ${submissionId}\r\nX-Mode: test\r\n\r\n${bodyText}\r\n`;
    fs.writeFileSync(filePath, eml, 'utf8');
    return { status: 'accepted', mode: 'test', filePath };
  }
  // Live path intentionally not implemented: implementing a Resend call
  // without ever being able to verify it reaches the network from here
  // would mean shipping code with a claimed behavior nobody tested.
  return { status: 'failed', mode: 'live', error: 'Live email not implemented in this environment — see docs/ARCHITECTURE_DECISION.md' };
}

module.exports = { sendReportEmail, isTestMode, OUT_DIR };
