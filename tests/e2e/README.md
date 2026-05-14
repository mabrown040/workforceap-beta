# E2E Smoke Tests

Fast, stable smoke tests for critical public user flows. Run these before deploying or after any change that touches routing, auth, or core page layouts.

## What’s Covered

| Spec | What it checks |
|------|---------------|
| `smoke/homepage.spec.ts` | Homepage loads, hero + program cards + footer visible |
| `smoke/login.spec.ts` | Login page loads, form fields render, links to signup/recovery |
| `smoke/programs.spec.ts` | Programs catalog loads, cards visible, apply CTA present |
| `smoke/apply.spec.ts` | Apply page loads, form area + sidebar render |

These are **unauthenticated** smoke tests — no credentials required.

## Requirements

- Node.js 20+
- Dev server running on `http://localhost:3000` **or** set `PLAYWRIGHT_BASE_URL`

## Run

```bash
# Run all e2e tests (Playwright will start dev server automatically if local)
npm run test:e2e

# Run only smoke tests
npx playwright test tests/e2e/smoke

# Run with UI mode for debugging
npm run test:e2e:ui

# Run against staging/prod
PLAYWRIGHT_BASE_URL=https://www.workforceap.org npx playwright test tests/e2e/smoke
```

## Viewports

- **Desktop**: 1280×720 (Chrome)
- **Mobile**: Pixel 5 emulation (393×851, touch-enabled)

## CI

In CI, the config disables the local web server, runs with 1 worker, and retries 2×.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Error: page.goto: net::ERR_CONNECTION_REFUSED` | Start dev server with `npm run dev` or let Playwright start it |
| Tests fail on first run | Playwright browsers may need install: `npx playwright install` |
| Screenshots missing | Screenshots are captured only on failure; check `test-results/` |
