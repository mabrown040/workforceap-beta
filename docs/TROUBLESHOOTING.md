# Troubleshooting Guide

Common issues you might hit during development and how to fix them.

---

## Build Failures

### `tsc --noEmit` fails with out-of-memory error

**Symptom:** Build crashes during "Linting and checking validity of types" with `JavaScript heap out of memory`.

**Fix:**
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or use the preflight script (does this automatically)
npm run preflight
```

**Note:** The production build (`next.config.ts`) intentionally skips build-time type checking because `tsc --noEmit` is run separately in CI. This is by design — the project has grown past what tsc-in-build can handle on standard build machines.

---

### `npm run build` fails with Prisma errors

**Symptom:** `Error: @prisma/client did not initialize yet` or `Query engine not found`.

**Fix:**
```bash
# Regenerate Prisma client
npm run db:generate

# If on Windows and you see EPERM rename errors, the build script retries automatically.
# If still failing:
npx prisma generate --schema=./prisma/schema.prisma
```

---

### `next build` fails with "Cannot find module '@prisma/client'"

**Symptom:** Module resolution error during build.

**Fix:**
```bash
# Ensure postinstall ran
npm run postinstall

# Or regenerate explicitly
npm run db:generate
```

---

### Bundle analysis build fails

**Symptom:** `ANALYZE=true npm run build` produces no output.

**Fix:** Check that `@next/bundle-analyzer` is installed. The analyzer opens automatically in your default browser after build.

---

## Database Issues

### `npm run db:migrate` fails with connection error

**Symptom:** `P1001: Can't reach database server` or `connection refused`.

**Fix:**
1. Check your `.env.local` has valid database credentials:
   ```bash
   # Option A: Supabase pooled connection (recommended for Prisma)
   POSTGRES_PRISMA_URL=postgresql://user:pass@host:6543/db?pgbouncer=true
   POSTGRES_URL_NON_POOLING=postgresql://user:pass@host:5432/db

   # Option B: Local dev fallback
   DATABASE_URL=postgresql://user:pass@localhost:5432/workforceap
   ```
2. For Supabase: Go to Dashboard → Project Settings → Database → copy the connection strings.
3. Make sure your IP is allowed in Supabase → Database → IPv4 settings.

---

### Migration is stuck / failed

**Symptom:** `prisma migrate dev` hangs or exits with migration errors.

**Fix:**
```bash
# Mark a failed migration as resolved (USE WITH CAUTION)
npm run db:migrate:resolve-failed

# Or manually:
npx prisma migrate resolve --applied <migration_name>
```

---

### `prisma db push` vs `prisma migrate dev`

| Command | When to use |
|---------|-------------|
| `npm run db:push` | Quick prototype changes (dev only). No migration file created. |
| `npm run db:migrate` | Proper migrations with SQL files. Use for all committed schema changes. |

**Rule:** Always use `db:migrate` for changes that will be deployed. `db:push` is for rapid local iteration only.

---

### Prisma Studio shows stale schema

**Symptom:** Studio shows old field names or missing tables.

**Fix:**
```bash
npm run db:generate
npm run db:studio
```

---

### "Unique constraint violated" during seed

**Symptom:** Seeding fails with duplicate key errors.

**Fix:**
```bash
# Clean up fixtures first
npm run db:cleanup-fixtures

# Then re-seed
npm run db:seed
```

---

## Auth Problems

### Login redirect loop

**Symptom:** Going to `/dashboard` redirects to `/login`, then back to `/dashboard` in a loop.

**Causes & fixes:**
1. **Missing Supabase env vars:** Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Session cookie issues:** Clear browser cookies for `localhost:3000`.
3. **Middleware auth check:** Ensure Supabase service role key is set (`SUPABASE_SERVICE_ROLE_KEY`).
4. **Session-only mode:** If you previously checked "Keep me signed in" off, sessions are ephemeral and may expire quickly during debugging. Check the `session_only` cookie.

---

### "MFA required" error on admin pages

**Symptom:** Redirected to `/verify-mfa` even though MFA appears set up.

**Fix:**
1. Check `STAFF_MFA_ENFORCEMENT` in `.env.local`. Set to `0` to disable enforcement during local dev:
   ```bash
   STAFF_MFA_ENFORCEMENT=0
   ```
2. If testing MFA flow: ensure your user has MFA enrolled in Supabase Auth dashboard.
3. Check the admin MFA trust cookie hasn't expired (default: 7 days, controlled by `ADMIN_MFA_TRUST_DAYS`).

---

### Supabase client throws in Server Component

**Symptom:** `Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required`.

**Fix:**
1. Ensure `.env.local` exists and has the values.
2. Restart the dev server after adding env vars (Next.js doesn't hot-reload env).
3. Check that you're importing from the right client:
   - Server Components: `import { getUser } from '@/lib/auth/server'`
   - Client Components: `import { createSupabaseBrowserClient } from '@/lib/supabase/browser'`

---

## i18n Missing Keys

### "MISSING_MESSAGE" error in browser console

**Symptom:** Text doesn't render; console shows missing message error.

**Fix:**
1. Add the key to `messages/en.json` first (English is the fallback).
2. The i18n config (`i18n/request.ts`) deep-merges English into other locales, so missing keys in `es.json` will fall back to English.
3. Restart dev server after editing message files (they are loaded at request time but may be cached).

---

### Locale redirect 308 loop

**Symptom:** Browser keeps redirecting between `/page` and `/en/page`.

**Fix:**
1. Check `middleware.ts` — `isLocaleableMarketingPath()` controls which paths get locale prefixes.
2. If your new page should be locale-prefixed, add its path to `LOCALEABLE_PATH_PREFIXES` in `lib/i18n/config.ts`.
3. Portal routes (under `/dashboard`, `/partner`, `/employer`) are intentionally NOT locale-prefixed.

---

## Test Failures

### Playwright tests fail with timeout

**Symptom:** E2E tests timeout waiting for page load.

**Fix:**
1. Ensure dev server is running on `http://localhost:3000`:
   ```bash
   npm run dev
   ```
2. Or set `PLAYWRIGHT_BASE_URL` to a deployed URL:
   ```bash
   PLAYWRIGHT_BASE_URL=https://staging.workforceap.org npm run test:e2e
   ```
3. Check that test credentials in `.env.local` / `.env.e2e.local` are valid:
   ```bash
   PLAYWRIGHT_MEMBER_EMAIL=member-test@workforceap.org
   PLAYWRIGHT_PORTAL_PASSWORD=TestWfAP2026!
   ```

---

### Vitest tests fail with module resolution

**Symptom:** `Cannot find module '@/lib/...'` in unit tests.

**Fix:** `vitest.config.ts` already has the `@` alias configured. If you're running tests outside the standard path, ensure your test file is in `tests/**/*.spec.ts` or `lib/**/*.test.ts`.

---

### E2E tests fail on auth state

**Symptom:** Tests fail because user isn't logged in.

**Fix:** Some tests use storage state (saved auth cookies). Check if `PLAYWRIGHT_STORAGE_STATE` points to a valid auth state file, or run the auth setup spec first:
```bash
npx playwright test tests/e2e/auth.spec.ts
```

---

## Environment & Config

### Env vars not loading

**Symptom:** `process.env.MY_VAR` is `undefined`.

**Fix:**
1. Ensure the var is in `.env.local` (not `.env.example`).
2. **Restart the dev server** — Next.js only loads `.env*` files at startup.
3. For server-only vars (no `NEXT_PUBLIC_` prefix): only accessible in Server Components, API routes, and server-side code. Client Components cannot read them.

---

### Windows-specific: Prisma engine lock error

**Symptom:** `EPERM: operation not permitted, rename node_modules\.prisma\client\query_engine-windows.dll.node`

**Fix:** The `scripts/prisma-env.js` wrapper automatically retries on this error (up to 4 times with backoff). If it still fails:
```bash
# Close any apps that might lock the file (IDEs, Prisma Studio)
# Then retry
npm run db:generate
```

---

## Cron Jobs

### Cron job returns 401 Unauthorized locally

**Symptom:** Hitting `/api/cron/daily-jobs` returns 401.

**Fix:** Cron endpoints require the `CRON_SECRET` header:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-jobs
```

Or use the local runner:
```bash
npx tsx scripts/cronq.ts daily-jobs
```

---

## Email

### Email preview server won't start

**Symptom:** `npm run email` fails or port 3001 is in use.

**Fix:**
```bash
# Use a different port
npx email dev -p 3002
```

### Emails not sending in dev

**Symptom:** Application flow says email sent but nothing arrives.

**Fix:** This is expected if `RESEND_API_KEY` is not set. The app gracefully skips email sending in development. Check server logs — email skips are usually logged.

---

## General Dev Tips

### Dev server is slow

- **Type checking:** Run `npm run typecheck` for fast feedback. Build-time type checking is enabled (`ignoreBuildErrors` is NOT set).
- **Check for memory leaks:** If you have many browser tabs open, consider closing some.
- **Use `npm run dev` not `npm run build` for development** — build is much slower.

### Changes not reflecting

1. **Client components:** Hot reload should work. If not, hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
2. **Server components:** May need a full page refresh (Next.js partial rendering).
3. **Middleware changes:** Restart the dev server — middleware is compiled at startup.
4. **Env vars:** Always restart the dev server.

### IDE / TypeScript issues

If VS Code shows type errors that `npm run typecheck` doesn't:
1. Restart the TS server (`Cmd+Shift+P` → "TypeScript: Restart TS Server").
2. Ensure your editor is using the workspace's TypeScript version, not a global one.

---

## Still Stuck?

1. Check the [Developer Onboarding Guide](DEVELOPER-ONBOARDING.md) for deeper context.
2. Read [`docs/ENVIRONMENT-VARIABLES.md`](ENVIRONMENT-VARIABLES.md) for env var details.
3. Check [`prisma/schema.prisma`](../prisma/schema.prisma) for database questions.
4. Look at existing API routes in `app/api/` for patterns.
