#!/usr/bin/env node
'use strict';
const { openDb } = require('../src/db');
const { createServer } = require('../src/server');
const { writeQuestionsJson } = require('../src/exportQuestions');

writeQuestionsJson(); // keep public/questions.json fresh on every start

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
// On Render, render.yaml wires PROCESSING_HOSTPORT from assessment-processing's
// private-network host:port automatically (see render.yaml) — no manual URL
// entry needed. PROCESSING_BASE_URL is for local dev / anything else.
const PROCESSING_BASE_URL = process.env.PROCESSING_BASE_URL
  || (process.env.PROCESSING_HOSTPORT ? `http://${process.env.PROCESSING_HOSTPORT}` : 'http://localhost:4000');
const PROCESSING_API_KEY = process.env.PROCESSING_API_KEY;

if (!PROCESSING_API_KEY) {
  console.warn('WARNING: PROCESSING_API_KEY not set — submissions to assessment-processing will fail with 401 until you set it.');
}

const db = openDb();
const server = createServer(db, { baseUrl: PROCESSING_BASE_URL, apiKey: PROCESSING_API_KEY });
server.listen(PORT, () => {
  console.log(`candidate-assessment listening on http://localhost:${PORT}`);
  console.log(`forwarding submissions to ${PROCESSING_BASE_URL}`);
});

process.on('SIGINT', async () => {
  const { closeBrowser } = require('../src/rawExport');
  await closeBrowser();
  server.close(() => process.exit(0));
});
