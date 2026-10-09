// Hand-written validators mirroring the Zod schema specified in the spec.
// No Zod available (npm blocked — see docs/ARCHITECTURE_DECISION.md), so
// this reproduces the same field names and the same error codes by hand.
'use strict';
const registry = require('./questionRegistry');

class ValidationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details || null;
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Validates an incoming AssessmentSubmission body.
 * Expected shape:
 * {
 *   candidate: { name: string, email?: string, code?: string },
 *   jobId?: string,
 *   assessmentVersion: string,
 *   questionBankHash: string,
 *   answers: { [questionId: string]: number | null },
 *   sourceSystem?: string
 * }
 */
function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('INVALID_SCHEMA', 'Request body must be a JSON object.');
  }

  const { candidate, assessmentVersion, questionBankHash, answers, sourceSystem, jobId } = body;

  if (!candidate || typeof candidate !== 'object' || !isNonEmptyString(candidate.name)) {
    throw new ValidationError('INVALID_SCHEMA', 'candidate.name is required and must be a non-empty string.');
  }
  if (candidate.email != null && typeof candidate.email !== 'string') {
    throw new ValidationError('INVALID_SCHEMA', 'candidate.email must be a string if provided.');
  }

  if (!isNonEmptyString(assessmentVersion)) {
    throw new ValidationError('INVALID_SCHEMA', 'assessmentVersion is required.');
  }
  if (assessmentVersion !== registry.ASSESSMENT_VERSION) {
    throw new ValidationError(
      'VERSION_MISMATCH',
      `assessmentVersion "${assessmentVersion}" does not match server's "${registry.ASSESSMENT_VERSION}".`
    );
  }

  if (!isNonEmptyString(questionBankHash)) {
    throw new ValidationError('INVALID_SCHEMA', 'questionBankHash is required.');
  }
  if (questionBankHash !== registry.QUESTION_BANK_HASH) {
    throw new ValidationError(
      'QUESTION_BANK_MISMATCH',
      `questionBankHash does not match the server's registry hash. The submitting client's question bank has drifted from the server's.`
    );
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new ValidationError('INVALID_SCHEMA', 'answers must be an object keyed by questionId.');
  }

  const seen = new Set();
  const badIds = [];
  const outOfRange = [];
  for (const [questionId, optionIndex] of Object.entries(answers)) {
    if (!registry.isValidQuestionId(questionId)) {
      badIds.push(questionId);
      continue;
    }
    if (seen.has(questionId)) {
      throw new ValidationError('DUPLICATE_ANSWER', `Duplicate answer for questionId "${questionId}".`);
    }
    seen.add(questionId);
    if (optionIndex !== null) {
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > registry.maxOptionIndex(questionId)) {
        outOfRange.push(questionId);
      }
    }
  }
  if (badIds.length) {
    throw new ValidationError('UNKNOWN_QUESTION_ID', `Unknown questionId(s): ${badIds.join(', ')}`, { badIds });
  }
  if (outOfRange.length) {
    throw new ValidationError('OPTION_INDEX_OUT_OF_RANGE', `optionIndex out of range for: ${outOfRange.join(', ')}`, { outOfRange });
  }

  const allIds = registry.listQuestionIds();
  const missing = allIds.filter((id) => !(id in answers));
  // Spec allows partial submissions to exist in draft state upstream, but a
  // final submission to this endpoint must be complete — see
  // docs/ASSESSMENT_API_CONTRACT.md "Completeness".
  if (missing.length) {
    throw new ValidationError('INCOMPLETE_SUBMISSION', `Missing answers for ${missing.length} question(s).`, { missing });
  }

  if (jobId != null && !isNonEmptyString(jobId)) {
    throw new ValidationError('INVALID_SCHEMA', 'jobId must be a non-empty string if provided.');
  }
  if (sourceSystem != null && !isNonEmptyString(sourceSystem)) {
    throw new ValidationError('INVALID_SCHEMA', 'sourceSystem must be a non-empty string if provided.');
  }

  return {
    candidate: { name: candidate.name.trim(), email: candidate.email || null, code: candidate.code || null },
    jobId: jobId || null,
    assessmentVersion,
    questionBankHash,
    answers,
    sourceSystem: sourceSystem || 'unknown',
  };
}

module.exports = { ValidationError, validateSubmission };
