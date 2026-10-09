// Question Registry — single source of truth for valid questionIds, built
// directly from work-mindset-assessment-engine.js (OCEAN-WB-0.2-proto).
// This is shared (by copy, see docs/ARCHITECTURE_DECISION.md — no private
// npm registry available to publish a shared package) with
// candidate-assessment's own copy of the engine file. A hash of the
// canonical structure is exposed so both sides can detect drift.
'use strict';
const crypto = require('crypto');
const engine = require('../work-mindset-assessment-engine.js');

const { OCEAN_QUESTIONS, MINDSET_DIMENSIONS, ASSESSMENT_VERSION } = engine;

const MINDSET_DIM_KEYS = Object.keys(MINDSET_DIMENSIONS); // time, ownership, growth, problemSolving, teamwork

/** @typedef {{questionId:string, kind:'ocean'|'mindset', dimension:string, index:number, text:string, optionCount:number}} RegistryEntry */

/** @type {RegistryEntry[]} */
const entries = [];

OCEAN_QUESTIONS.forEach((q, i) => {
  entries.push({
    questionId: `ocean:${q.id}`,
    kind: 'ocean',
    dimension: q.dimension,
    index: i, // position in the OCEAN_QUESTIONS array / oceanAnswers array the engine expects
    text: q.text,
    optionCount: q.options.length,
  });
});

MINDSET_DIM_KEYS.forEach((dimKey) => {
  MINDSET_DIMENSIONS[dimKey].questions.forEach((q, i) => {
    entries.push({
      questionId: `mindset:${dimKey}:${i + 1}`,
      kind: 'mindset',
      dimension: dimKey,
      index: i, // position within MINDSET_DIMENSIONS[dimKey].questions / mindsetAnswers[dimKey] array
      text: q.text,
      optionCount: q.options.length,
    });
  });
});

const byId = new Map(entries.map((e) => [e.questionId, e]));

/** Canonical serialization used for hashing — stable field order, no whitespace drift. */
function canonicalString() {
  return JSON.stringify(
    entries
      .map((e) => [e.questionId, e.kind, e.dimension, e.index, e.optionCount])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  );
}

const QUESTION_BANK_HASH = crypto.createHash('sha256').update(canonicalString()).digest('hex');

function listQuestionIds() {
  return entries.map((e) => e.questionId);
}

function getEntry(questionId) {
  return byId.get(questionId) || null;
}

function isValidQuestionId(questionId) {
  return byId.has(questionId);
}

function maxOptionIndex(questionId) {
  const e = byId.get(questionId);
  return e ? e.optionCount - 1 : -1;
}

/**
 * Convert a flat {questionId: optionIndex|null} map (the API's wire format)
 * into the two positional arrays the engine functions expect.
 * Assumes the map has already passed validateAnswerSet() in validation.js.
 */
function toEngineInputs(answerMap) {
  const oceanAnswers = new Array(OCEAN_QUESTIONS.length).fill(null);
  const mindsetAnswers = {};
  MINDSET_DIM_KEYS.forEach((k) => {
    mindsetAnswers[k] = new Array(MINDSET_DIMENSIONS[k].questions.length).fill(null);
  });

  for (const [questionId, optionIndex] of Object.entries(answerMap)) {
    const e = byId.get(questionId);
    if (!e) continue; // already validated upstream; defensive no-op here
    if (e.kind === 'ocean') {
      oceanAnswers[e.index] = optionIndex;
    } else {
      mindsetAnswers[e.dimension][e.index] = optionIndex;
    }
  }
  return { oceanAnswers, mindsetAnswers };
}

/** Public (candidate-facing) question list — no dimension/construct/indicator exposed. */
function publicQuestionList() {
  return entries.map((e, order) => ({
    questionId: e.questionId,
    order,
    kind: e.kind,
    text: e.text,
    optionCount: e.optionCount,
  }));
}

module.exports = {
  ASSESSMENT_VERSION,
  MINDSET_DIM_KEYS,
  entries,
  QUESTION_BANK_HASH,
  listQuestionIds,
  getEntry,
  isValidQuestionId,
  maxOptionIndex,
  toEngineInputs,
  publicQuestionList,
};
