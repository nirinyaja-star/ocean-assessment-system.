// Independent copy of the same registry logic used by assessment-processing
// (no private npm registry available to share a package between the two
// projects — see ../../assessment-processing/docs/ARCHITECTURE_DECISION.md).
// Both sides compute the SAME questionBankHash from the SAME source file
// (work-mindset-assessment-engine.js), so drift between them is detectable
// at submission time (QUESTION_BANK_MISMATCH) rather than silent.
'use strict';
const crypto = require('crypto');
const engine = require('../work-mindset-assessment-engine.js');

const { OCEAN_QUESTIONS, MINDSET_DIMENSIONS, ASSESSMENT_VERSION } = engine;
const MINDSET_DIM_KEYS = Object.keys(MINDSET_DIMENSIONS);

const entries = [];
OCEAN_QUESTIONS.forEach((q, i) => {
  entries.push({ questionId: `ocean:${q.id}`, kind: 'ocean', dimension: q.dimension, index: i, text: q.text, options: q.options.map((o) => o.text) });
});
MINDSET_DIM_KEYS.forEach((dimKey) => {
  MINDSET_DIMENSIONS[dimKey].questions.forEach((q, i) => {
    entries.push({
      questionId: `mindset:${dimKey}:${i + 1}`,
      kind: 'mindset',
      dimension: dimKey,
      index: i,
      text: q.text,
      options: q.options.map((o) => o.text),
    });
  });
});

function canonicalString() {
  return JSON.stringify(
    entries.map((e) => [e.questionId, e.kind, e.dimension, e.index, e.options.length]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  );
}
const QUESTION_BANK_HASH = crypto.createHash('sha256').update(canonicalString()).digest('hex');

function listQuestionIds() {
  return entries.map((e) => e.questionId);
}

module.exports = { ASSESSMENT_VERSION, QUESTION_BANK_HASH, entries, listQuestionIds, MINDSET_DIM_KEYS };
