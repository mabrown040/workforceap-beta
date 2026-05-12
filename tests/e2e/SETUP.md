# E2E: Coursera launch smoke test

This project’s Playwright suite lives under `tests/e2e`. The **Coursera launch** spec is:

- `tests/e2e/coursera-launch.spec.ts`

It covers the member path implemented by `components/portal/TrackedCourseraLaunchLink.tsx`: click **Open Coursera** on `/dashboard/training`, follow the redirect from `GET /api/member/coursera/launch`, and assert the result is a real Coursera content URL (not the internal `/programs/{slug}` 404 pattern the API avoids).

## Prerequisites

1. **App running** (unless you point at staging/prod with `PLAYWRIGHT_BASE_URL`):
   - Local: `npm run dev` (Playwright can start this via `playwright.config.ts` when `PLAYWRIGHT_BASE_URL` is localhost).
   - Database and env vars must match whatever your dev server needs (see project README / deployment docs).

2. **Test member (Coursera-enrolled)**  
   The account must have an active Coursera-backed program so the UI shows **Open Coursera**. Members with no program see a different empty state; the test skips if that link is missing.

3. **Environment variables** (shell or `tests/../.env.e2e.local` — loaded automatically by `playwright.config.ts`):

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_MEMBER_EMAIL` | Member **Institutional ID** (same as other member E2Es) |
| `PLAYWRIGHT_PORTAL_PASSWORD` | Member **Access key** |
| `PLAYWRIGHT_BASE_URL` | Optional; default `http://localhost:3000`. Use `https://…` for staging. |

Example:

```bash
export PLAYWRIGHT_MEMBER_EMAIL='your-test-member-id'
export PLAYWRIGHT_PORTAL_PASSWORD='your-test-access-key'
npm run test:e2e -- tests/e2e/coursera-launch.spec.ts
```

## What the test asserts

1. **Launch API:** `GET /api/member/coursera/launch` returns **302/303/307** (member session required).
2. **Coursera destination:** The popup’s main **document** response from `coursera.org` returns **200**, and the final URL matches `/learn/`, `/professional-certificates/`, or `/specializations/` (a concrete course/specialization path, not a bare homepage).
3. **Tracked click / server action:** A **POST** to `/dashboard/training` with a **Next-Action** header returns **200**. That is the Next.js server action invoked by `logCourseraLaunchFromPortal` in `app/(portal)/dashboard/_actions/analyticsActions.ts` (product analytics / “coursera_launch_click” logging when `ENABLE_ANALYTICS_LOGS` is on — the E2E still proves the round-trip fires).

This is **not** the LRS xAPI `POST /api/xapi/statements` flow; for that, see `tests/e2e/sprint-p2-xapi-coursera-smoke.spec.ts` and `docs/coursera-xapi-setup.md`.

## CI

Wire `PLAYWRIGHT_MEMBER_EMAIL` / `PLAYWRIGHT_PORTAL_PASSWORD` (and `PLAYWRIGHT_BASE_URL` if not local) as secrets for a job that runs `npm run test:e2e -- tests/e2e/coursera-launch.spec.ts`. Without credentials, the `describe` block is skipped at collection time.
