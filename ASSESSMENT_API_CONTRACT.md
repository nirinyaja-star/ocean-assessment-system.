# Assessment API Contract — `assessment-processing`

This is the real, running contract implemented in `src/server.js` and
exercised by `tests/api.test.js` (18/18 passing — see
`docs/INTEGRATION_TEST_REPORT.md`). `candidate-assessment` (Project 02)
consumes exactly this contract.

Base URL in this sandbox: `http://localhost:4000` (set `PORT` to change).

## Auth

All `/api/*` routes require `Authorization: Bearer <recruiter api key>`.
Create a recruiter + key with the internal test helper:

```
POST /internal/recruiters
{ "name": "...", "email": "..." }
→ 201 { "id": "...", "apiKey": "sk_..." }
```

(This endpoint is a sandbox/test convenience, not part of the production
contract — a real deployment would create recruiters via an admin flow,
not a public endpoint.)

## `GET /health`
→ `200 { status: "ok", assessmentVersion, questionBankHash }`

## `GET /api/v1/question-registry`
Public. Returns the 50 question IDs, text and option counts — **no**
dimension, construct, or indicator mapping (kept server-only, per spec).
→ `200 { assessmentVersion, questionBankHash, questions: [{questionId, order, kind, text, optionCount}, ...] }`

## `POST /api/v1/submissions`
Headers: `Authorization: Bearer <key>`, `Idempotency-Key: <client-generated string>`

Body:
```json
{
  "candidate": { "name": "string (required)", "email": "string?", "code": "string?" },
  "jobId": "string? (from POST /api/v1/jobs)",
  "assessmentVersion": "OCEAN-WB-0.2-proto",
  "questionBankHash": "<sha256 from /api/v1/question-registry>",
  "answers": { "ocean:1": 0, "mindset:time:1": 2, ... /* all 50 questionIds required */ },
  "sourceSystem": "string? e.g. 'candidate-assessment'"
}
```

Responses:
- `202 { submissionId, status, statusReason? }` — processed synchronously in this sandbox (no queue infra), but reports the state machine `received → validating → processing → completed|failed|needs_review` faithfully.
- `202 { submissionId, status, replay: true }` — same Idempotency-Key + same body replayed.
- `400 { error: { code: "MISSING_IDEMPOTENCY_KEY" } }`
- `409 { error: { code: "IDEMPOTENCY_KEY_REUSED" } }` — same key, different body.
- `422 { error: { code, message, details? } }` — one of: `INVALID_SCHEMA`, `VERSION_MISMATCH`, `QUESTION_BANK_MISMATCH`, `UNKNOWN_QUESTION_ID`, `OPTION_INDEX_OUT_OF_RANGE`, `DUPLICATE_ANSWER`, `INCOMPLETE_SUBMISSION`.

## `GET /api/v1/submissions/:id`
→ `200 { id, status, statusReason, createdAt, updatedAt }` / `404` if not found or not yours.

## `GET /api/v1/submissions/:id/report`
→ `200 <report object>` if `status === "completed"`, else `409 { error: { code: "REPORT_NOT_READY" } }`.
Report shape is exactly what `work-mindset-assessment-engine.js`'s `generateReport()` returns — see that file or `src/reportHtml.js` for field names.

## `GET /api/v1/submissions/:id/export?format=pdf|docx`
→ binary file (`application/pdf` or the docx mime type). See `docs/ARCHITECTURE_DECISION.md` for why PDF is rendered via headless Chromium rather than pdf-lib's standard fonts (Thai glyph support).

## `POST /api/v1/jobs`
Body: `{ "title": "string?", "jdVersion": "string?", "text": "string (required)" }`
→ `201 { jobId, parsed }` where `parsed` is `work-mindset-assessment-engine.js`'s `parseJobDescription()` output.

## `POST /api/v1/submissions/:id/send-email`
Sends (test-mode only — see `docs/ARCHITECTURE_DECISION.md`) the report notification to the recruiter's own email.
→ `202 { status: "accepted", mode: "test", filePath }` or `502 { status: "failed", mode, error }`.

## Error object shape
```json
{ "error": { "code": "STRING_CODE", "message": "human-readable", "details": {} } }
```
