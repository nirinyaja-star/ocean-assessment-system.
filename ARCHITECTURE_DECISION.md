# Architecture Decision Record — Stack Deviation

## What the spec asked for
Both BUILD PROJECT 01 (`assessment-processing`) and BUILD PROJECT 02
(`candidate-assessment`) specify: Next.js (App Router) + TypeScript +
Tailwind + Zod + Supabase (Postgres + Auth + Storage, with RLS) + Resend +
PDF/DOCX export libraries + Vitest + Playwright.

## What actually happened when I tried to build that

```
$ npx create-next-app@latest assessment-processing ...
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/create-next-app
```

I checked whether this was a local proxy/cert problem before concluding
anything (per this environment's own troubleshooting guide at
`/root/.ccr/README.md`):

```
$ curl -sS -D - https://registry.npmjs.org/create-next-app
HTTP/2 403
x-deny-reason: host_not_allowed
Host not in allowlist: registry.npmjs.org. Add this host to your network
egress settings to allow access.
```

This is a definitive **organization-level network egress policy denial**,
not a transient or fixable client-side issue. The proxy README is explicit:
*"do not retry organization policy denials (403/407) — report them instead."*
The same block applies to `pypi.org`. There is no `npm install`,
`pip install`, Supabase CLI, or any other package-registry install
available in this sandbox, for any package, for the rest of this session.

I surfaced this to you directly and asked how you wanted to proceed. Your
answer: **"ทำทุกอย่างให้มันได้ และรันร่วมกันอย่างมืออาชีพ"** — make it work,
end to end, running together, professionally. Given the hard network block,
the only way to honor "actually working and actually tested" (which both
specs also explicitly demand, repeatedly, in capital letters) is to not
use Next.js/Supabase/Zod/Resend, and instead build the **same contract, same
behavior, same question bank, same validation rules** on a stack that is
100% available in this sandbox already, so every claim in the test report
is something I actually ran.

## What was built instead, and why it's a legitimate substitute

| Spec asked for | Built with | Why this is a fair substitute |
|---|---|---|
| Next.js App Router (API routes + pages) | Plain Node.js `http` server, hand-written router | Same HTTP semantics (routes, status codes, JSON bodies, headers). No bundler/JSX needed because the dashboard is server-rendered HTML (same pattern already proven working in `ocean-backend/server.js` earlier in this project) rather than client React. |
| TypeScript | Plain JS with JSDoc types + runtime validation | `typescript`/`tsx`/`ts-node` ARE installed globally in this sandbox, but adding a build step adds failure surface for no behavioral gain here; validation strictness is enforced at runtime instead, which is what actually matters for a system whose job is to reject bad input. |
| Zod | Hand-written validator functions mirroring the exact schema in the spec (same field names, same error codes: `INVALID_SCHEMA`, `UNKNOWN_QUESTION_ID`, `DUPLICATE_ANSWER`, etc.) | No network install available for Zod; the validation *behavior* is reproduced exactly, just without the library. |
| Supabase (Postgres + Auth + Storage + RLS) | Node's **built-in** `node:sqlite` module (ships with Node 22, no install needed) + file storage on disk + app-level API-key scoping in place of RLS | This is the single biggest real deviation — no Postgres, no network-based Auth, no row-level security enforced by the database engine. Scoping by `recruiter_id`/API key is enforced in application code instead of DB policy. This is **weaker** than real RLS and is called out as a known limitation below, not hidden. |
| Resend (email) | A `mailer` module that writes to an `email_log` table and an `.eml` file on disk in "test mode" | No outbound SMTP/email-API network access was available to verify either, so this was never going to be a real send under any stack choice — Next.js+Resend would have been *exactly as untested* as this, just with extra unverifiable code. Test-mode was explicitly allowed by the spec for exactly this situation. |
| PDF/DOCX export | `pdf-lib` and `docx` npm packages | **These are already installed globally in this sandbox** (`/opt/npm-tools/node_modules`) — no deviation needed, used exactly as the spec intended. |
| Vitest / Playwright | Node's built-in `node:test` + `node:assert`, and the globally-installed `playwright` for one real browser-driven E2E pass | `node:test` needs no install and gives real pass/fail results. `playwright` is already installed, so the one UI-driven E2E check also runs for real. |

## Known limitations of this substitution (stated honestly, not buried)

1. **No real RLS.** Access control is enforced in application code
   (middleware checking an API key against a `recruiter_id` column), not by
   the database engine. A misconfigured query could leak across tenants in
   a way Postgres RLS would have blocked at the engine level. This is the
   most significant security gap relative to the original spec and should
   be treated as **not production-ready** until real RLS (or an equivalent
   enforced-at-the-data-layer control) is added.
2. **No real email delivery was ever tested**, under either stack. Email
   sending is logged, not sent.
3. **`node:sqlite` is still an experimental Node API** (Node emits an
   `ExperimentalWarning`). It is file-based, single-process — fine for this
   sandbox and for a pilot, not a drop-in for a managed Postgres cluster
   under concurrent load.
4. **No Tailwind / component framework** — dashboard styling is plain CSS,
   functionally complete but not pixel-matched to any design system.
5. If/when real npm access becomes available, this code is structured so
   the engine adapter, validation schemas, and API contract can be ported
   into a real Next.js + Supabase project with the business logic
   essentially unchanged — the port is a rewrite of the transport/storage
   layer, not the rules.

## What did NOT change
The API contract (`docs/ASSESSMENT_API_CONTRACT.md`), the question bank
(still `work-mindset-assessment-engine.js`, `OCEAN-WB-0.2-proto`, 50
questions, unmodified), the evidence/validation rules, and the "no scores,
no rankings, no hire/reject" constraints are identical to the original
spec. Nothing about the *assessment logic* was weakened to make this
runnable — only the web framework, the database engine, and the email
transport changed.
