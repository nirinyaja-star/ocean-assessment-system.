# assessment-processing (BUILD PROJECT 01)

Recruiter-side backend: receives candidate submissions, runs them through
`work-mindset-assessment-engine.js`, compares against a job description,
exports PDF/DOCX reports, and serves a recruiter dashboard.

**Read `docs/ARCHITECTURE_DECISION.md` first.** The original spec asked
for Next.js + Supabase; this sandbox cannot `npm install` anything
(organization network policy — verified, not assumed). This is a
functionally-equivalent plain-Node.js build instead, with the deviation
and its real limitations (no engine-level RLS, no real email send) stated
honestly rather than hidden.

## Run it
```
npm test           # node --test tests/ — 18/18 passing, see docs/INTEGRATION_TEST_REPORT.md
node bin/start.js   # starts the real server on :4000
```

Create a recruiter + API key:
```
curl -X POST http://localhost:4000/internal/recruiters \
  -H 'content-type: application/json' \
  -d '{"name":"Nirinya","email":"nirinya.ja@gmail.com"}'
```
Then open `http://localhost:4000/dashboard?key=<apiKey>`.

## Layout
- `src/questionRegistry.js` — stable questionIds + hash, built from `../work-mindset-assessment-engine.js`
- `src/validation.js` — hand-written validation (Zod substitute)
- `src/engineAdapter.js` — the only module that touches the raw engine ("server-only")
- `src/db.js` — `node:sqlite` schema (Supabase/Postgres substitute)
- `src/auth.js` — API-key auth (RLS substitute — see architecture doc for the limitation)
- `src/export.js` — PDF (via headless Chromium, for Thai glyph support) + DOCX
- `src/mailer.js` — test-mode email (writes `.eml` to disk)
- `src/dashboard.js` — server-rendered recruiter dashboard
- `src/server.js` — the HTTP API + routing
- `docs/ASSESSMENT_API_CONTRACT.md` — the contract Project 02 consumes
- `docs/INTEGRATION_TEST_REPORT.md` — honest test results
