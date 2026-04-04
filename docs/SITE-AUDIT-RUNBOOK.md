# Site audit runbook

One-off checks referenced from the site audit plan: Lighthouse (performance / a11y / SEO), axe (automated in CI via Playwright), and dependency review.

## Install

The repo uses **pnpm** (`pnpm-lock.yaml`, `packageManager` in `package.json`). CI runs `pnpm install --frozen-lockfile`.

```bash
pnpm install
```

## ESLint

```bash
pnpm run lint
```

## axe (Playwright)

Runs against a local dev server (Playwright `webServer` starts `pnpm run dev` unless `CI` is set).

First-time setup (downloads Chromium):

```bash
pnpm exec playwright install chromium
```

Smoke tests hit `/terms` and `/privacy` and exclude the `color-contrast` axe rule so CI/local runs are not blocked by known marketing token debt; run a full axe pass in Chrome DevTools or remove that exclusion when fixing contrast.

```bash
pnpm run test:a11y
```

## Dependency audit (pnpm)

Latest run: `pnpm audit` reported **no known vulnerabilities** (re-run after dependency changes).

## Lighthouse (manual / local)

Requires a running site on port 3000:

```bash
pnpm run build && pnpm run start
```

In another terminal:

```bash
npx lighthouse http://127.0.0.1:3000 --only-categories=performance,accessibility,best-practices,seo --output=html --output-path=./artifacts/lighthouse-home.html
```

Repeat for `/login` or other URLs by changing the URL. Commit `artifacts/` only if you intend to keep reports in git (default: add `artifacts/` to `.gitignore` if not already).

## Dependency audit

```bash
pnpm audit
```

Review `high` / `critical` advisories and upgrade or accept risk per dependency.
