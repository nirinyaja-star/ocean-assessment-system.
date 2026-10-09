// Server-to-server integration client: POSTs a validated, complete answer
// set to assessment-processing's real /api/v1/submissions, following the
// contract documented in ../../assessment-processing/docs/ASSESSMENT_API_CONTRACT.md.
// Idempotency key is generated once per local submission and reused across
// retries (so a retry after a network blip can never create a duplicate
// submission server-side). Retry uses capped exponential backoff; the
// delivery_status/retry_count/last_error columns in local_submissions let
// a caller poll progress instead of blocking on a long retry loop.
'use strict';

class IntegrationError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl e.g. http://localhost:4000
 * @param {string} opts.apiKey assessment-processing recruiter API key
 * @param {string} opts.idempotencyKey stable per local submission
 * @param {object} opts.payload AssessmentSubmission body
 * @param {number} [opts.maxRetries]
 * @param {number} [opts.baseDelayMs]
 */
async function submitWithRetry({ baseUrl, apiKey, idempotencyKey, payload, maxRetries = 3, baseDelayMs = 50, onAttempt }) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (onAttempt) onAttempt(attempt);
      const res = await fetch(`${baseUrl}/api/v1/submissions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 202) {
        return { ok: true, status: res.status, body, attempts: attempt + 1 };
      }
      // 4xx (validation, auth, idempotency conflict) are not retryable —
      // retrying would send the exact same bad request again.
      if (res.status >= 400 && res.status < 500) {
        throw new IntegrationError(`assessment-processing rejected the submission: ${res.status}`, { status: res.status, body });
      }
      lastErr = new IntegrationError(`assessment-processing returned ${res.status}`, { status: res.status, body });
    } catch (e) {
      lastErr = e instanceof IntegrationError ? e : new IntegrationError(e.message);
      if (e instanceof IntegrationError && e.status && e.status < 500) throw e; // don't retry client errors
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr;
}

module.exports = { submitWithRetry, IntegrationError };
