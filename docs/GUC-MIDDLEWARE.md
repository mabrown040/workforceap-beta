# GUC Middleware Architecture

How RLS-supporting Postgres GUCs (`app.current_user_id`, `app.current_org_id`,
`app.current_role`, `app.current_employer_id`, `app.current_partner_id`) get
set on every Prisma query.

## Layers

1. **AsyncLocalStorage context** — `lib/db/gucContext.ts`
   - `getGucContext()` / `runWithGucContext(ctx, fn)`
   - `ANONYMOUS_GUC_CONTEXT`, `SYSTEM_GUC_CONTEXT`
   - `requireGucContext()` — throws if no context exists (use in sensitive ops)

2. **Prisma `$use` middleware** — `lib/db/prisma.ts`
   - Reads the active `GucContext` and emits `SET LOCAL app.current_*` before
     each query
   - Recursion guard skips its own `SET LOCAL` queries
   - Transaction guard skips when the `$transaction` wrapper already set GUCs
   - Dev-only `console.warn` when a query runs with no active context
   - In production, missing context silently falls back to anonymous so the
     site stays up

3. **Request-scoped wrappers** — `lib/db/withRequestGuc.ts`
   - `withApiGuc(handler)` — default for API routes; resolves auth, falls
     back to anonymous
   - `withAuthenticatedApiGuc(handler)` — 401s if no user
   - `withSystemGuc(fn)` — for cron jobs & webhooks
   - `withAnonymousGuc(fn)` — explicit anon
   - `withUserGuc(user, fn, opts)` — when caller already has a `User`

4. **Auth integration** — `lib/auth/server.ts`
   - `resolveAuthGucContext()` — single call that returns a `GucContext`
     from Supabase session + Profile lookup

5. **SSR root layout** — `app/layout.tsx`
   - Wraps the entire SSR tree in `gucContextStorage.run()` so every Server
     Component below shares one context

6. **Edge middleware** — `middleware.ts`
   - Forwards `x-wap-user-id` securely from the Supabase session

7. **Cron jobs** — `lib/cron/withCronLogging.ts`
   - Wraps every cron handler in `SYSTEM_GUC_CONTEXT`

## Usage

API route (default):
```ts
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET(request: NextRequest) { /* ... */ }
export const GET = withApiGuc(_GET);
```

Authenticated-only API route:
```ts
import { withAuthenticatedApiGuc } from '@/lib/db/withRequestGuc';

async function _POST(request: NextRequest, userId: string) { /* ... */ }
export const POST = withAuthenticatedApiGuc(_POST);
```

Webhook (system context):
```ts
export const POST = (req: NextRequest) =>
  withSystemGuc(() => handleWebhook(req));
```

Sensitive operation:
```ts
import { requireGucContext } from '@/lib/db/gucContext';

const ctx = requireGucContext(); // throws if missing
```

## Caveats

- `SET LOCAL` only persists within a transaction. For non-transactional
  single queries the `$executeRawUnsafe` and the actual query may land on
  different pool connections. For guaranteed RLS enforcement on multi-step
  reads, wrap in `prisma.$transaction(...)`; the `$transaction` override
  injects the GUC query inside the transaction boundary.
- Dev warnings only fire when `NODE_ENV === 'development'`.
- Tests must establish a context (e.g. `runWithGucContext(ANONYMOUS_GUC_CONTEXT, ...)`)
  or accept the dev warning.

## Related

- `prisma/migrations/20260513040000_add_rls_policies/` — RLS policies that
  read these GUCs
- `docs/SECURITY-CHECKLIST.md` — overall hardening status
- `docs/TENANT-ISOLATION.md` — tenant scoping layers
