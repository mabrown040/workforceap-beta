# Production Paid-Funnel Smoke

Run this after every public-surface launch PR and after Vercel production deploys.

```bash
npm run smoke:prod
```

The smoke checks:

- `/`
- `/apply`
- `/apply?utm_source=google_ads&utm_medium=cpc&utm_campaign=launch_smoke`
- `/programs`
- `/employers`
- `/login`

It uses `gstack browse`, captures mobile screenshots, checks for console errors, verifies basic route text, and fails on launch-risk claim regressions such as hard placeholder outcome numbers or `Apply Now — Free`.

Useful overrides:

```bash
SMOKE_BASE_URL=https://www.workforceap.org npm run smoke:prod
SMOKE_VIEWPORT=1440x1000 npm run smoke:prod
SMOKE_OUTPUT_DIR=/tmp/wap-prod-smoke-manual npm run smoke:prod
GBROWSE_BIN=~/.claude/skills/gstack/browse/dist/browse npm run smoke:prod
```

Outputs:

- `summary.md`
- `summary.json`
- one screenshot per checked route

Default output path:

```text
/tmp/wap-prod-smoke-<timestamp>/
```

Pass criteria:

- each route returns HTTP `200` after locale redirects
- page body renders expected text
- no browser console errors
- no known launch-risk public claim patterns are present
- paid UTM apply path is always included
