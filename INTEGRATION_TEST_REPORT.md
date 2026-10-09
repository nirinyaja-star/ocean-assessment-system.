# Integration Test Report — `assessment-processing`

**See also:** `../candidate-assessment/docs/INTEGRATION_TEST_REPORT.md`,
specifically its `tests/e2e.test.js` — a real headless-browser click-through
of the candidate app that starts THIS server's real code and submits into
it for real, then verifies the real report. That is the strongest test of
this server that exists in this project, and it lives in the other
project's test suite because it's inherently a cross-project test.

Honest, as-run results. Nothing below is claimed without having actually
executed it in this session. See `docs/ARCHITECTURE_DECISION.md` for why
this is plain Node.js rather than Next.js/Supabase.

## How to reproduce
```
cd assessment-processing
npm test          # node --test tests/
node bin/start.js  # runs the real server on :4000
```

## Automated test run (`node --test tests/api.test.js`)

**Result: 18/18 passing.** Full raw TAP output was inspected, not just the
summary line. Tests run against a real in-memory `node:sqlite` DB and a
real HTTP server on a real (OS-assigned) port — no mocking of the HTTP
layer, the database, or the assessment engine.

| # | Test | Verifies |
|---|---|---|
| 1 | health endpoint reports real question bank hash | `/health` matches `questionRegistry.js`'s live hash |
| 2 | question registry endpoint exposes all 50 questions, no indicator/construct leak | public question list never exposes scoring internals |
| 3 | unauthenticated request rejected | 401 with no `Authorization` header |
| 4 | wrong API key rejected | 401 with a bogus key |
| 5 | missing Idempotency-Key rejected | 400 `MISSING_IDEMPOTENCY_KEY` |
| 6 | invalid schema rejected | 422 `INVALID_SCHEMA` |
| 7 | unknown questionId rejected | 422 `UNKNOWN_QUESTION_ID` |
| 8 | question bank hash mismatch rejected | 422 `QUESTION_BANK_MISMATCH` |
| 9 | incomplete submission rejected | 422 `INCOMPLETE_SUBMISSION` |
| 10 | valid full submission → `completed`, report has no score/rank/percentage fields | real engine run, real field-level check (not naive substring ban — see comment in test file for why) |
| 11 | idempotent replay returns same submissionId, no duplicate row | real DB row count check |
| 12 | reused Idempotency-Key + different body → 409 | `IDEMPOTENCY_KEY_REUSED` |
| 13 | cross-tenant read blocked | recruiter B cannot read recruiter A's submission (app-level isolation — see limitation below) |
| 14 | PDF export | real file, `%PDF-` magic bytes, >5KB |
| 15 | DOCX export | real file, `PK` zip magic bytes |
| 16 | JD upload/parse | real `parseJobDescription()` call, structured output |
| 17 | send-email (test mode) | `.eml` file actually exists on disk afterward |
| 18 | dashboard renders | real HTML response for an authenticated recruiter |

## Manual verification beyond the automated suite

- **Thai text in PDF exports**: extracted with `pdftotext` and read back —
  Thai renders correctly (see transcript in this session). Also
  **proved** (not assumed) that `pdf-lib`'s standard fonts throw on Thai
  text (`_probePdfLibThaiLimitation()` in `src/export.js`), which is why
  PDF export uses headless Chromium instead.
- **Full pipeline manually traced once** outside the test suite: create
  recruiter → submit 50 answers → idempotent replay → status → report →
  PDF export → dashboard HTML → 401 without a key. All matched expectations.

## Known gaps / NOT tested

- **No real concurrent load.** `node:sqlite` is single-process,
  file-based; this was never tested under concurrent writers. Fine for a
  pilot, not validated for production traffic.
- **No real email delivery**, under any stack (see architecture doc) —
  only the test-mode `.eml`-on-disk path is tested.
- **No real RLS.** Tenant isolation (test #13) is enforced in application
  code (`WHERE recruiter_id = ?` on every query), not by the database
  engine. A future query that forgets that clause would leak data in a way
  Postgres RLS would have caught structurally. This is the most important
  thing to fix before using this with real candidate data.
- **No automated browser/E2E test of the dashboard UI itself** (only an
  HTTP-level fetch-and-assert of the HTML, not a Playwright click-through
  of the dashboard). A real Playwright click-through of `candidate-assessment`
  submitting into this server IS included — see
  `candidate-assessment/docs/INTEGRATION_TEST_REPORT.md` and the combined
  end-to-end run recorded there.
- **15-table schema from the original spec was condensed to 9 tables**
  (`src/db.js`) — same information, fewer separate tables (e.g. no
  separate `audit_events`/`status_history` table; status transitions are
  tracked via `updated_at` + `audit_log`, not a full history table). If a
  full append-only status history is required later, add a
  `submission_status_history` table — straightforward, not done here
  because nothing in the current tests needed it.
