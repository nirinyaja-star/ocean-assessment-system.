'use strict';
const registry = require('./questionRegistry');

class ValidationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details || null;
  }
}

/** Same completeness/shape rules as assessment-processing's validator (kept in sync by hand — see docs). */
function validateAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new ValidationError('INVALID_SCHEMA', 'answers must be an object keyed by questionId.');
  }
  const byId = new Map(registry.entries.map((e) => [e.questionId, e]));
  const badIds = [];
  const outOfRange = [];
  for (const [qid, idx] of Object.entries(answers)) {
    const e = byId.get(qid);
    if (!e) {
      badIds.push(qid);
      continue;
    }
    if (idx !== null && (!Number.isInteger(idx) || idx < 0 || idx >= e.options.length)) outOfRange.push(qid);
  }
  if (badIds.length) throw new ValidationError('UNKNOWN_QUESTION_ID', `Unknown questionId(s): ${badIds.join(', ')}`);
  if (outOfRange.length) throw new ValidationError('OPTION_INDEX_OUT_OF_RANGE', `Out of range: ${outOfRange.join(', ')}`);
  const missing = registry.listQuestionIds().filter((id) => !(id in answers) || answers[id] === null);
  if (missing.length) throw new ValidationError('INCOMPLETE_SUBMISSION', `Missing ${missing.length} answer(s).`, { missing });
  return true;
}

module.exports = { validateAnswers, ValidationError };
