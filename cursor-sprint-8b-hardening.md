# Sprint 8b: Production Hardening

Three targeted fixes: batched bulk job import, portal-scoped error boundaries, and Sentry. Spec below; **implementation is complete** in the repo.

---

## 1. Batch N+1 in bulk job import

**Intent:** Avoid serial `prisma.job.create()` inside loops when ATS or text parsing returns many drafts.

**Shipped:** `lib/employer/bulkJobInsert.ts` uses `prisma.job.createManyAndReturn({ data })` so each batch is one round-trip. `app/api/employer/jobs/import-bulk/route.ts` builds arrays of `Prisma.JobUncheckedCreateInput` via `buildEmployerJobCreateData` and inserts in batch (ATS job lists, multi-draft text paths, careers page).

---

## 2. Portal-level error boundaries

**Intent:** Recover from client errors inside member / employer / partner shells without losing portal context.

**Shipped:**

- `app/(portal)/dashboard/error.tsx` — Try again, Back to dashboard (`/dashboard`), WorkforceAP home
- `app/(portal)/employer/error.tsx` — Try again, Employer overview (`/employer`), `/employers`
- `app/(portal)/partner/error.tsx` — Try again, Partner overview (`/partner`), home

Each calls `Sentry.captureException` in `useEffect` when Sentry is enabled.

`app/error.tsx` (global) also reports via `Sentry.captureException`.

---

## 3. Sentry

**Shipped:**

- `@sentry/nextjs` + `withSentryConfig` in `next.config.ts` (CSP `connect-src` extended for Sentry ingest)
- `instrumentation.ts` — `register()` loads `sentry.server.config` / `sentry.edge.config`; exports `onRequestError` → `captureRequestError`
- `instrumentation-client.ts` — `Sentry.init` + `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart`
- `sentry.server.config.ts`, `sentry.edge.config.ts` — init when `SENTRY_DSN` is set (production only)

**Vercel / env**

- `SENTRY_DSN` — server and edge
- `NEXT_PUBLIC_SENTRY_DSN` — browser (same project DSN; optional but recommended for client errors)
- `SENTRY_AUTH_TOKEN` (+ `SENTRY_ORG`, `SENTRY_PROJECT`) — source maps at build time

See `.env.example` for placeholders.

---

## Quality bar

- `npx tsc --noEmit` passes
- `npm run build` passes
