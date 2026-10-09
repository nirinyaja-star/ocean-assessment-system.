# candidate-assessment (BUILD PROJECT 02)

Candidate-facing app: presents all 50 questions (30 OCEAN + 20 Work
Mindset) from `../work-mindset-assessment-engine.js`, with progress,
navigation, draft-autosave, and edit-before-submit — then forwards the
answers to `assessment-processing` (Project 01) and offers raw
(non-analyzed) export.

**Read `docs/ARCHITECTURE_DECISION.md` first** (same npm-block story as
Project 01).

## Run it (with Project 01 running)
```
cd ../assessment-processing && node bin/start.js &      # :4000
curl -s -X POST http://localhost:4000/internal/recruiters \
  -H 'content-type: application/json' -d '{"name":"R","email":"r@example.com"}'
# copy the apiKey from that response, then:
cd ../candidate-assessment
PROCESSING_API_KEY=<apiKey> node bin/start.js            # :5000
```
Open `http://localhost:5000/`.

## Test it
```
npm test   # node --test tests/ — 11/11 passing (includes a REAL browser
           # click-through against a REAL running Project 01 — see
           # docs/INTEGRATION_TEST_REPORT.md)
```

## Layout
- `src/questionRegistry.js` — independent copy of the same registry logic as Project 01 (same hash, verified identical)
- `src/validation.js` — completeness check before accepting a submission
- `src/integrationClient.js` — calls Project 01's real API with idempotency + retry
- `src/rawExport.js` — JSON/CSV/DOCX/PDF of raw answers only (no analysis — enforced by what this file is allowed to `require`)
- `src/db.js` — local delivery-tracking store (`node:sqlite`)
- `src/server.js` — HTTP server: serves the SPA, `/api/submit`, `/api/export/:id`
- `public/index.html` — the candidate-facing single-page app
- `docs/INTEGRATION_TEST_REPORT.md` — honest test results, including the real E2E run
