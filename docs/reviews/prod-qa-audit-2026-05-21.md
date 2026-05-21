# Production QA Audit — workforceap.org

**Date:** 2026-05-21  
**Branch:** `review/prod-qa-audit`  
**Reference:** `wap-repo` (source of truth)  
**Method:** Live HTML fetch via `curl` + `wget`; parse meta tags, links, forms, images, ARIA; probe internal links and `/api/*` targets. No browser runtime.

**Host:** `https://www.workforceap.org` (apex `workforceap.org` → 307 → www)

---

## Executive summary

| Severity | Count | Headline |
|----------|-------|----------|
| **Critical** | 0 | No 5xx routes, no broken internal links, no missing core SEO on public marketing pages |
| **High** | 1 | `hreflang` alternate tags absent in rendered HTML despite `buildPageMetadata()` config |
| **Medium** | 4 | `/employer` auth redirect semantics; decorative hero `alt=""`; icon-only nav buttons; partners lazy hero markup |
| **Low** | 5 | Locale 308 redirects; page weight; TTFB spread; apply form action vs client nav; rate-limited contact API probe |

**Overall:** Top marketing routes are healthy for launch QA. Primary follow-ups are i18n SEO (`hreflang`) and recurring nav a11y on auth/marketing shells.

---

## Route matrix

All requests used `curl -sSL -A 'WAP-Prod-QA-Audit/1.0'`. TTFB = `time_starttransfer` from curl. Bytes = downloaded HTML body (curl); wget cross-check within ~1 KB.

| Route | HTTP | Effective URL | TTFB (ms) | Bytes | Meta desc | Canonical | OG | JSON-LD | Internal links | Broken links |
|-------|------|---------------|-----------|-------|-----------|-----------|----|---------|----------------|--------------|
| `/` | 200 | `/en` | 516 | 271 KB | ✓ | ✓ `/en` | ✓ | ✓ Org + WebSite | 28/28 | 0 |
| `/apply` | 200 | `/en/apply` | 330 | 192 KB | ✓ | ✓ | ✓ | ✓ Org + WebSite | 24/24 | 0 |
| `/login` | 200 | `/en/login` | 317 | 147 KB | ✓ | ✓ | ✓ | ✓ Org + WebSite | 22/22 | 0 |
| `/employer` | 200* | `/en/login?redirectTo=%2Femployer` | 306 | 147 KB | ✓† | ✓† | ✓† | ✓ Org + WebSite | 25/25 | 0 |
| `/partners` | 200 | `/en/partners` | 351 | 237 KB | ✓ | ✓ | ✓ | ✓ Org + WebSite | 25/25 | 0 |
| `/programs` | 200 | `/en/programs` | 337 | 334 KB | ✓ | ✓ | ✓ | ✓ Org + WebSite | 62/62 | 0 |
| `/find-your-path` | 200 | `/en/find-your-path` | 321 | 196 KB | ✓ | ✓ | ✓ | ✓ Org + WebSite | 30/30 | 0 |
| `/es` | 200 | `/es` | 291 | 282 KB | ✓ | ✓ `/es` | ✓ `es_US` | ✓ Org + WebSite | 28/28 | 0 |

\* Initial response is **307** → login (protected portal path in `middleware.ts` `PORTAL_PATHS`). Final HTML after `-L` is login page (200).  
† Meta/canonical/OG reflect **login**, not employer portal content — correct for rendered page, misleading if `/employer` is treated as a public landing URL.

**Locale redirects (expected):**

- `/` → **308** → `/en` (`next.config.ts` / i18n prefix)
- `/apply`, `/login`, `/partners`, `/programs`, `/find-your-path` → **308** → `/en/…`
- `/es` → no prefix redirect (served at `/es`)
- Marketing employer landing is **`/employers`** (308 → `/en/employers`), not `/employer`

---

## Findings by severity

### Critical

_None._

---

### High

#### H1 — Missing `hreflang` alternate link tags in rendered HTML

**Routes:** All audited routes (`/`, `/apply`, `/login`, `/employer`, `/partners`, `/programs`, `/find-your-path`, `/es`)

**Observed:** Zero `<link rel="alternate" hreflang="…">` tags in fetched HTML.

**Expected (repo):** `app/seo.ts` `buildPageMetadata()` sets `alternates.languages` for `en`, `es`, `fr`, `pt`:

```38:46:app/seo.ts
export function buildPageMetadata({ title, description, path, locale = DEFAULT_LOCALE, image, robots }: PageSeoInput): Metadata {
  // ...
  const languageAlternates: Record<string, string> = {};
  for (const l of APP_LOCALES) {
    languageAlternates[l] = absoluteUrl(withLocalePrefix(normalizedPath === '' ? '/' : normalizedPath, l));
  }
```

**Impact:** Search engines may not discover localized equivalents as reliably as intended; conflicts with sitemap locale prefixes (`app/sitemap.ts` lists `/es`, etc.).

**Recommendation:** Verify Next.js metadata rendering for `alternates.languages` in production build; confirm tags appear in `<head>` for marketing routes.

---

### Medium

#### M1 — `/employer` is a protected portal path, not the marketing employer page

**Observed:** `GET /employer` → **307** `Location: /en/login?redirectTo=%2Femployer`. Rendered page is login with `robots: noindex, nofollow` (matches `app/(auth)/login/page.tsx`).

**Repo context:** Portal route (`middleware.ts` `PORTAL_PATHS`). Public marketing content lives at **`/employers`** (`app/employers/page.tsx`).

**Impact:** Auditing `/employer` as a marketing surface will always show login SEO. Nav/footer links correctly point to `/employers`.

**Recommendation:** Treat `/employer` as auth-gated portal entry in docs/QA checklists; use `/employers` for public employer marketing QA.

---

#### M2 — Decorative hero images with empty `alt` on auth-adjacent pages

**Routes:** `/login`, `/employer` (login redirect), `/partners`

**Observed:** Next/Image hero uses `alt=""` on `/_next/image?url=%2Fimages%2Fhero-people.webp…`

**Repo note:** Decorative images may intentionally use empty alt, but `/partners` also has a **lazy-loaded** duplicate with `aria-hidden="true"` and empty alt — redundant lazy decorative layer.

**Impact:** Low functional risk if truly decorative; fails strict audits that flag any empty `alt` on `<img>`.

**Recommendation:** Confirm decorative treatment; for partners hero, prefer single priority image or explicit `role="presentation"` pattern consistently.

---

#### M3 — Icon-only navigation buttons missing accessible names (SSR HTML)

**Routes:** All pages with marketing nav (incl. `/`, `/apply`, `/login`, `/partners`, `/programs`, `/find-your-path`, `/es`)

**Observed in HTML parser:**

- `#…-about-us-trigger` — `aria-expanded` / `aria-haspopup` but no visible text or `aria-label` in opening tag
- Theme toggle `<button>` — dashed border inline style, no `aria-label` in SSR snippet
- Parser flagged 1–10 unnamed `<button>` elements per page

**Impact:** Screen reader users may hear unlabeled controls before client hydration (if labels are JS-only).

**Recommendation:** Add `aria-label` in SSR for About dropdown trigger and theme toggle (`components/MainNav.tsx` / theme components).

---

#### M4 — Partners page ships known placeholder content (repo-documented)

**Route:** `/partners`

**Repo:** `app/partners/page.tsx` header comments note placeholder logos, stats, and demo embed TODOs before launch.

**Observed live:** Page returns 200 with full SEO; placeholder logos render as text cards; stats band present.

**Impact:** Product/trust issue rather than broken QA; aligns with repo warnings.

---

### Low

#### L1 — Locale prefix 308 redirects on unprefixed English URLs

**Observed:** `/`, `/apply`, etc. redirect to `/en/…`. Canonicals correctly use prefixed URLs.

**Impact:** Expected i18n behavior; bookmarking unprefixed URLs adds one hop.

---

#### L2 — Page weight (HTML document size)

| Route | Approx HTML |
|-------|-------------|
| `/programs` | **334 KB** (largest) |
| `/es` | 282 KB |
| `/` | 271 KB |
| `/partners` | 237 KB |
| `/find-your-path` | 196 KB |
| `/apply` | 192 KB |
| `/login` | 147 KB |

**Impact:** TTFB acceptable (~290–520 ms) but large RSC payloads may affect mobile first load.

---

#### L3 — Apply form HTML `action` vs client navigation

**Route:** `/apply`

**Observed:** `<form action="/en/apply/results" method="get">` in HTML; repo `ApplyEligibilityClient.tsx` uses `e.preventDefault()` + `router.push()` to results.

**Probe:** `POST /en/apply/results` → 200 (returns HTML, not an API error).

**Impact:** No production break; progressive enhancement falls back to GET navigation if JS disabled.

---

#### L4 — `/api/contact` rate limiting on empty POST probe

**Probe:** `POST /api/contact` with minimal JSON → **429** `Too many submissions. Please try again in an hour.`

**Impact:** Endpoint is live and protected; not a dead route. Employer/partner forms POST here per repo (`EmployerContactForm.tsx`, etc.).

---

#### L5 — `/api/leads/employer` is GET-only (by design)

**Observed:** `GET /api/leads/employer` → **302** → `/employers#employer-intake`; `POST` → **405**.

**Repo:** `app/api/leads/employer/route.ts` exports GET redirect only. Marketing CTA links use GET.

**Impact:** None — correct behavior.

---

## Form & API resolution

Client-side forms do not expose `/api/*` in static HTML (except `/employers` RSC payload referencing `/api/leads/employer`). Probed endpoints from repo source:

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/auth/login` | POST | **401** | Invalid creds — route alive |
| `/api/apply/signup` | POST | **400** | Validation — route alive |
| `/api/apply/status-lookup` | POST | **400** | Validation — route alive |
| `/api/partner/signup` | POST | **400** | `Required` — route alive |
| `/api/careers/recommend` | POST | **400** | Validation — route alive (`/find-your-path`) |
| `/api/contact` | POST | **429** | Rate limited (probe) |
| `/api/employer/signup` | POST | **400** | Validation — route alive |
| `/api/leads/employer` | GET | **302** | Redirect to intake anchor |
| `/api/leads/employer` | POST | **405** | GET-only by design |
| `/api/apply/submit` | POST | **404** | Not present in repo (apply uses `/apply/results` + signup flow) |
| `/api/apply/draft` | POST | **404** | Not present in repo |

**Apply flow (repo):** Step 1 → client storage + navigate to `/apply/results`; account creation → `POST /api/apply/signup`.

**Login flow (repo):** `POST /api/auth/login` via `LoginForm.tsx`.

**Partners flow (repo):** `POST /api/partner/signup` via `PartnerSignupForm.tsx`.

**Employers marketing (not in top-route list but related):** Contact form → `POST /api/contact`; CTA → `GET /api/leads/employer`.

---

## SEO detail vs repo expectations

| Check | Result |
|-------|--------|
| `metadataBase` `https://www.workforceap.org` | Canonicals use www ✓ |
| Per-page `generateMetadata` / `buildPageMetadataAsync` | Titles/descriptions match live content ✓ |
| Root JSON-LD (`components/JsonLd.tsx`) | Organization + WebSite on all routes ✓ |
| Login `robots: noindex, nofollow` | Present in HTML ✓ |
| OG image per page | Custom images on `/apply`, `/partners`; default hero elsewhere ✓ |
| `hreflang` alternates | **Missing in HTML** (see H1) |

---

## Internal link crawl summary

Every unique internal `<a href>` on each route was fetched with curl. **Zero 4xx/5xx** across **244 total link checks** (sum of per-route internal links).

Sample destinations verified: `/en/programs/*`, `/en/apply`, `/en/employers`, `/es/*`, footer legal (`/privacy`, `/terms`), decision-journey (`/program-comparison`, `/salary-guide`).

---

## Commands (repro)

```bash
# Per-route timing + size
curl -sSL -o /tmp/page.html -w '%{http_code}\t%{time_starttransfer}\t%{size_download}\t%{url_effective}\n' \
  -A 'WAP-Prod-QA-Audit/1.0' 'https://www.workforceap.org/programs'

# Redirect chain (no follow)
curl -sSI -A 'WAP-Prod-QA-Audit/1.0' 'https://www.workforceap.org/employer' | rg -i '^HTTP|^location'

# API probe
curl -sS -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{}' \
  -A 'WAP-Prod-QA-Audit/1.0' 'https://www.workforceap.org/api/auth/login'
```

---

## Recommended next actions

1. **H1:** Fix or verify `hreflang` `<link>` emission for `APP_LOCALES` in production metadata.
2. **M3:** Add SSR `aria-label`s for About dropdown and theme toggle.
3. **M1:** Document `/employer` (portal) vs `/employers` (marketing) in QA playbooks.
4. **M4:** Replace partners placeholders before external launch (per repo TODOs).

---

*Generated 2026-05-21. No application code changed in this audit.*
