# ESHANTVA 3D Studio

**Customer-first 3D printing website · Next.js App Router · Supabase**

[Website](https://eshantva3d.co.in) · [Engineering source](https://github.com/eshantvaenterprises-stack/ESHANTVA-3D-Studio) · [Project rules](AGENTS.md)

> **Release status: `NOT_DEPLOY_READY`**  
> This repository contains a source candidate, **not** a claim that the current production website runs this commit. Production deployment remains founder-controlled and locked. No GitHub push automatically updates Netlify.

## What this website supports

| Surface | Purpose | Boundary |
| --- | --- | --- |
| Public customer pages | Services, Contact / appointment requests, Custom Orders, Bulk Orders | Customer-only site |
| Customer account | Sign-in, dashboard, owner-scoped orders and files | Permanent authenticated user and server authorization |
| Admin console | Customer/request/order management and approved artifact actions | Separate server-verified ADMIN / STAFF roles |
| Retail/catalog code | Preserved for future engineering | **Hidden from public** |
| Recruitment code/data | Preserved under private controls | **Closed and hidden** |

No sample products, fabricated orders or private applicant/operations records are authorized for public release.

## Architecture

```text
Customer browser / Admin browser
           │
   Next.js App Router
    (static export)
           │
 Supabase Edge Functions
   │        │         │
 Auth    PostgreSQL  Private Storage
         + RLS      (signed access)
```

- **Frontend:** Next.js 16.4.2, React 19, TypeScript.
- **Backend:** Supabase Auth, Edge Functions, PostgreSQL with RLS, and private object storage.
- **Host configuration:** Netlify static export; `netlify.toml` and `scripts/prepare-netlify-export.mjs` produce protected `_headers` and `_redirects` artifacts.
- **Security:** no service-role secrets in browser source, separate customer/Admin authorization, private object access, strict script CSP, sensitive route `no-store`, and server-side transitions.

This diagram is an architecture overview, **not** evidence that protected hosted integration tests have passed.

## Local developer workflow

Use Node.js **22** and the repository lockfile. Never paste secrets into code or commit `.env.local`.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
node scripts/prepare-netlify-export.mjs
npm run test:netlify-export
```

For the isolated customer-only configuration, see [`.env.example`](.env.example), [`AGENTS.md`](AGENTS.md), and [`netlify.toml`](netlify.toml). Use only controlled development identities and isolated test data. `npm test` is the complete source suite; targeted tests are not a substitute for it or for hosted browser acceptance. Browser and provider tests may require separately authorized environments.

## V52R1 engineering snapshot (15 November 2026)

The **V52R1 reviewed source candidate** contains 14 source-file changes (11 edits, 3 additions), including layout-aware RSC export handling, focused regression harness improvements, and Edge TypeScript type-safety repairs. Source-integrity review and scoped local test receipts are available in the separately held private evidence package; **that evidence is intentionally not committed to this public repository**.

| Gate | Current verified scope |
| --- | --- |
| Source identity / original G0 | `PASS_VERIFIED_SCOPED` (archive, hashes, environment identity) |
| P04 security headers, routing and CSP | `PARTIAL` (local/static and earlier preview evidence; canonical production headers unresolved) |
| D0 protected hosted acceptance | `BLOCKED_EXACT_EXTERNAL` |
| H01–H12 authenticated customer/Admin flows | `BLOCKED_EXACT_EXTERNAL` for full protected positive cases |
| H13 complete hosted assets/routes/CSP | `PARTIAL` |
| G3 independent recoverability | `DEFERRED_NOT_PASS` |
| OPEN-10 notification release | `DEFERRED_NOT_PASS`; notification guard **OFF** |

A local test pass does **not** turn these into hosted or production passes. Preserve historical FAIL receipts alongside subsequent retests. Production promotion, Netlify diagnostic uploads, live customer/test fixtures, remote migrations and outbound messages each need the applicable separate authorization and safety gates.

## Publishing and safety

1. **GitHub engineering branch**: source review and versioned commits, with no default-branch merge implied.
2. **Netlify private diagnostic**: a separate hosted artifact and permission decision; source commits do not deploy it by themselves.
3. **Locked production**: must not be promoted, reconfigured or published until independent recovery, protected acceptance and founder release approval are completed.

The website currently associated with `https://eshantva3d.co.in` is a **different artifact** from an unhosted V52R1 candidate. Do not infer deployment parity from this README.

## Contributing and governance

Read [`AGENTS.md`](AGENTS.md) before any modification. Keep changes scoped to verified defects, preserve existing security and hidden-feature flags, and retain exact test evidence and hashes in authorized private custody. For source collaboration, a **pull request (PR)** is a proposal to review changes before merging; a PR is **not** a deployment.

---

*Maintained for ESHANTVA's customer-only website engineering workflow. Information here describes verified source scope and release restrictions, not a public launch announcement.*
