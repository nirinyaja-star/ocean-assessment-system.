# Integration Test Report — `candidate-assessment`

Honest, as-run results.

## Reproduce
```
cd candidate-assessment
npm test                    # node --test tests/  (3 files, 11 tests total)
PROCESSING_API_KEY=<key> node bin/start.js   # runs the real server on :5000
```

## 1. `tests/integrationClient.test.js` — 4/4 passing
Against a deliberately flaky **mock** HTTP server (used only here, to
force specific failure modes on demand that a real server won't reliably
reproduce on command):
- succeeds immediately on first 202
- retries on 500 three times then succeeds, reusing the **same**
  Idempotency-Key on every retry (verified by recording the header on
  every call the mock received)
- does **not** retry on 422 (client error — retrying would just resend
  the same invalid request)
- gives up after `maxRetries` and throws

## 2. `tests/server.test.js` — 6/6 passing
Candidate-assessment's own HTTP server, against the same kind of mock
processing backend (isolates "does this server's own logic work" from
"does the real other project work" — that's covered separately below):
- serves the SPA + its question bank (50 questions)
- rejects an incomplete submission **before** ever calling out to
  assessment-processing
- accepts a full submission, forwards it, records the remote result
- raw JSON export contains question+answer text only — explicitly
  checked for **zero** leakage of `indicator`/`theme`/`pattern`/
  `reasoning`/`construct` fields (this is the non-analyzed-export
  requirement, verified by scanning the actual exported content, not by
  reading the code and assuming)
- raw CSV export: UTF-8 BOM byte-checked (not string-checked — see the
  in-file comment explaining why `.text()` would have hidden a missing
  BOM) and a formula-injection payload (`=cmd|...`) in the candidate name
  is verified neutralized with a leading `'`
- raw PDF/DOCX exports are real binary files (`%PDF-` / `PK` magic bytes)

## 3. `tests/e2e.test.js` — 1/1 passing — **the real thing**
This is the test that matters most for "ทำทุกอย่างให้มันได้ และรันร่วมกันอย่างมืออาชีพ"
(make it all work, running together, professionally):

1. Starts the **actual** `assessment-processing` server (Project 01's real
   source, `require`d directly — not a copy, not a mock) on an in-memory DB.
2. Starts the **actual** `candidate-assessment` server pointed at it with a
   real API key obtained from Project 01's own recruiter-creation endpoint.
3. Launches a **real headless Chromium browser** (Playwright) and drives
   the **real candidate SPA**: fills the name/email fields, clicks through
   all 50 real question screens by clicking real radio inputs and real
   "ถัดไป" buttons, reaches the real review screen, clicks real "ส่งคำตอบ".
4. Confirms a `localId` is shown and candidate-assessment's own DB marked
   delivery `accepted` with a `remote_submission_id`.
5. Independently queries **Project 01's real API directly** (not through
   Project 02) for that `remoteSubmissionId`'s report and confirms it is a
   real, evidence-backed report: all 5 Work Mindset dimensions present,
   at least one OCEAN pattern with real evidence.
6. Clicks the real "ดาวน์โหลดคำตอบของฉัน" PDF link on the real done-screen
   and confirms the response is a real PDF (`%PDF-` magic bytes).

Nothing in this test is mocked. Both servers are the real code that ships.

## Known gaps / NOT tested
- No test of the **browser's localStorage draft-autosave actually
  surviving a page reload** mid-assessment (the save/load code paths are
  exercised, but not a reload-and-resume click-through). Worth adding if
  draft recovery becomes a reported issue.
- No load/concurrency test (same caveat as Project 01 — `node:sqlite` is
  single-process).
- No test of a genuinely offline/network-partition scenario beyond what
  the mocked 500/503 responses simulate — a real network drop behaves
  differently from a mock server returning an error status.
- PDPA-specific controls (data retention windows, deletion-on-request)
  are **not implemented**, only noted as a requirement — out of scope for
  what could be verified in this session.
