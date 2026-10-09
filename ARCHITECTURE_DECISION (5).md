See `../assessment-processing/docs/ARCHITECTURE_DECISION.md` for the full
rationale (npm registry is hard-blocked by org policy in this sandbox —
confirmed with a direct `curl` returning `403 Host not in allowlist`, not
a transient issue). The short version for this project specifically:

- Spec asked for Next.js/TypeScript/Zod + the same Supabase/email/export
  stack as Project 01. Same block applies here.
- Built instead: plain Node.js `http` server, the candidate SPA as a
  single hand-written HTML/JS page (no React/Next bundler — but this one
  genuinely doesn't need one; it's one page, server-rendered-nothing,
  client-side state only), `node:sqlite` for local delivery tracking,
  `docx`/`playwright` (both already installed) for raw export.
- The one thing this project could NOT fake its way around: a **real**
  integration test needs a **real** Project 01 to submit to. So
  `tests/e2e.test.js` starts the actual `assessment-processing` server
  (requiring its source directly) in the same test process and drives the
  actual candidate UI against it in a real headless browser. This is
  stronger verification than the spec's own suggestion of "use a Mock
  Server and flag unverified real connectivity if Project 01 doesn't exist
  as real running code" — Project 01 DOES exist as real running code in
  this same repo/session, so the mock-server fallback wasn't needed.
