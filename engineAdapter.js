// Server-only wrapper around work-mindset-assessment-engine.js. The raw
// engine module is never required by anything reachable from the browser
// (the dashboard is server-rendered HTML; see src/dashboard.js) — this
// file is the only module that touches it, which is what "server-only"
// meant to accomplish even without Next.js's own server/client split.
'use strict';
const engine = require('../work-mindset-assessment-engine.js');
const registry = require('./questionRegistry');

/**
 * @param {Record<string, number|null>} answerMap keyed by questionId, already validated
 * @param {string|null} jdRawText raw job description text, or null
 * @param {{candidateName:string, candidateCode:string|null, jobTitle?:string}} meta
 */
function buildReport(answerMap, jdRawText, meta) {
  const { oceanAnswers, mindsetAnswers } = registry.toEngineInputs(answerMap);
  const jobContext = jdRawText ? engine.parseJobDescription(jdRawText) : null;
  const report = engine.generateReport(oceanAnswers, mindsetAnswers, jobContext, {
    candidateName: meta.candidateName,
    candidateCode: meta.candidateCode,
  });
  return report;
}

function parseJD(text) {
  return engine.parseJobDescription(text);
}

module.exports = {
  ASSESSMENT_VERSION: engine.ASSESSMENT_VERSION,
  buildReport,
  parseJD,
};
