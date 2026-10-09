// Emits the candidate-facing question bank as a JSON file the browser page
// fetches at runtime, so public/index.html never needs its own copy of the
// questions (single source of truth: the registry, which sources from
// work-mindset-assessment-engine.js).
'use strict';
const fs = require('fs');
const path = require('path');
const registry = require('./questionRegistry');

function writeQuestionsJson(outPath = path.join(__dirname, '..', 'public', 'questions.json')) {
  const payload = {
    assessmentVersion: registry.ASSESSMENT_VERSION,
    questionBankHash: registry.QUESTION_BANK_HASH,
    questions: registry.entries.map((e, order) => ({
      questionId: e.questionId,
      order,
      kind: e.kind, // 'ocean' | 'mindset' — UI uses this only to group/label sections, not to score
      text: e.text,
      options: e.options,
    })),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

module.exports = { writeQuestionsJson };

if (require.main === module) {
  const p = writeQuestionsJson();
  console.log('wrote', p);
}
