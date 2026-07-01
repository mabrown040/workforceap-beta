# Engineering Review: i18n Architecture (dench/spanish-pass-2)

> **Superseded as of 2026-07-01:** Most findings below are resolved — the three competing i18n systems have been unified on `next-intl`, the hardcoded `<html lang="en">` now derives from the locale header, and the es.json translation-parity gap is closed to ~100%. This document is kept for historical context only and should not be read as a live P0/P1 list.

## Executive Summary

The Spanish localization on this branch **ships with a TypeScript build-blocking bug** (duplicate key in `serverLabels.ts`) and introduces a **three-headed i18n architecture** that will compound maintenance cost with every new language. The immediate surface-level Spanish wiring is functional, but the underlying patterns need consolidation before expanding to more languages or pages.

**Verdict:** Fix the build blocker and land, but schedule a hardening sprint within the next 2 weeks before adding French, Portuguese, or CMS integration.

---

## 1. i18n Architecture — Three Competing Systems (Severity: P1)

### Finding
The codebase now maintains translations in **three separate, non-overlapping stores**:

| System | Location | Used By | Scope |
|--------|----------|---------|-------|
| **next-i18next** | `public/locales/{en,es,fr,pt}/common.json` | `PortalNav.tsx`, `CareerCounselor.tsx` | Portal nav labels |
| **LocaleContext inline** | `components/portal/LocaleContext.tsx` `TRANSLATIONS` object | `LanguageToggle`, most portal client components | Portal UI labels |
| **serverLabels inline** | `lib/i18n/serverLabels.ts` `SERVER_LABELS_ES` | Marketing pages (`how-it-works`, `leadership`, `apply`, etc.) | Server-rendered marketing copy |

This means adding one new label requires editing **2–3 different files with different key conventions** (JSON dotted keys, `nav:dashboard` style, and raw English sentences).

### Impact
- Translator workflow is impossible — no single extraction target
- Risk of drift: Spanish portal nav says "Inicio" while marketing page says "Home" for the same concept
- Adding a 4th language means copy-pasting the entire `SERVER_LABELS_ES` object into a new `SERVER_LABELS_FR` — ~160 lines × N languages

### Recommendation
**Consolidate to one system.** `next-i18next` is already installed and configured (`next-i18next.config.js`). Migrate `LocaleContext` and `serverLabels` to use the JSON files under `public/locales/`. For server components, load the JSON directly (or use a lightweight server-side i18n helper that reads the same JSON). For client components, keep `react-i18next` via `next-i18next` or wrap it in `LocaleContext` if you need the cookie sync behavior.

**Short-term (this PR):** Not required. Land Spanish wiring as-is.
**Medium-term (next sprint):** Merge the three stores. Target: one `locales/` directory as the single source of truth.

---

## 2. serverLabels.ts Pattern — Duplicate Key & Brittle Keys (Severity: P0)

### Finding
```
lib/i18n/serverLabels.ts(116,3): error TS1117: An object literal cannot have multiple properties with the same name.
```

`'How It Works'` appears twice — once at line 51 (`'Cómo funciona'`) and again at line 116 (`'Cómo Funciona'`). The second overwrites the first at runtime and fails the build.

Additional issues:
- **English sentences as dictionary keys** — any copy edit (punctuation, capitalization) silently breaks the lookup
- **No namespacing** — `'Get Started'` is both a standalone heading and embedded inside `'Phase 1 — Get Started'`, requiring duplication
- **Redundant locale APIs**: `getServerLocaleAsync()` in `serverLabels.ts` and `getLocale()` in `serverLocale.ts` do the same thing with slightly different cookie key constants (`COOKIE_KEY` vs `LOCALE_COOKIE`, but same value `'wap-locale'`)

### Recommendation
**Immediate:** Remove the duplicate `'How It Works'` entry (line 116). Consolidate `getServerLocaleAsync()` and `getLocale()` into a single function in `serverLocale.ts`. Delete the duplicate from `serverLabels.ts`.

**Before next language:** Replace sentence-keys with stable dotted keys (`'howItWorks.title'`, `'howItWorks.description'`). This prevents copy edits from breaking lookups and enables namespacing.

---

## 3. Async Safety & Server Rendering Overhead (Severity: P2)

### Finding
Every server-rendered page now calls:
```tsx
const locale = await getLocale();
const t = makeServerT(locale);
```

- `cookies()` from `next/headers` is async and can throw during static generation or edge runtime. The `try/catch` fallback to `'en'` is correct, but this adds an async boundary to every page render.
- `html lang="en"` is **hardcoded** in `app/layout.tsx` — the document language tag never updates when the user selects Spanish. This hurts accessibility (screen readers) and SEO.
- `generateMetadata()` was added to 4 pages (`how-it-works`, `leadership`, `what-we-do`, `apply`) replacing static `export const metadata`. Async metadata generation adds a small but measurable render delay for what was previously synchronous.

### Recommendation
- **Fix `html lang`**: read the locale cookie in `RootLayout` and set `<html lang={locale}>` dynamically.
- **Cache locale detection**: the cookie value rarely changes per user. Consider passing locale via a React context or prop from layout to avoid re-reading cookies on every nested page. In Next.js App Router, this is tricky — an alternative is a lightweight locale detection in middleware that injects a header, eliminating per-page cookie reads.
- **Keep `generateMetadata()`**: the SEO benefit of localized titles justifies the async cost, but measure if build times regress.

---

## 4. Build / Deployment Impact — Prisma Schema Drift (Severity: P1)

### Finding
`npm run typecheck` reports **31 errors**, of which **1 is i18n-related** (`serverLabels.ts` duplicate key) and **30 are Prisma type mismatches**:

- `hasEmploymentBarrier` missing from `ProfileSelect`
- `profile` relation missing from `User` query results
- `placementAgreementSigned`, `hiringPipelineActive`, `targetCertifications` missing from `Employer` types
- `brandColor` missing from `Partner` types

These suggest the Prisma schema was modified (migration applied to the DB) but the generated client (`prisma generate`) is out of date or the schema file itself is stale. The build script runs `prisma generate` as part of `npm run build`, so **Vercel builds may pass if the generate step refreshes the client**. However, local `npm run typecheck` fails because it does not run `prisma generate` first.

**The `what-we-do` page also imports `prisma` and queries `EmployerWhereInput` with `hiringPipelineActive`**, which is in the diff for this branch.

### Recommendation
- **Immediate:** Run `prisma generate` locally and re-run `typecheck`. If errors persist, the schema file needs a migration.
- **Before merge:** Verify the `what-we-do` page diff does not introduce new Prisma field references without a matching migration.
- **CI safeguard:** Add `prisma generate` before `tsc --noEmit` in the typecheck script, or create a separate `typecheck:ci` that includes the generate step.

---

## 5. Performance (Severity: P2)

### Finding
- **Per-page locale overhead**: 14 server pages now read cookies and construct translation closures on every request. In a high-traffic scenario, this is ~14 cookie store instantiations per page load.
- **`PHASES(t)` recreated on every render** in `how-it-works/page.tsx`:
  ```tsx
  {PHASES(t).map((phase, phaseIdx) => (
    <div key={phase.id} style={{ marginBottom: phaseIdx < PHASES(t).length - 1 ? '4rem' : 0 }}>
  ```
  `PHASES(t)` is called twice per iteration (once in map, once for length check), creating a new array each time.
- **Bundle size**: `SERVER_LABELS_ES` is a large inline object. It lives in the server bundle (fine), but `TRANSLATIONS` in `LocaleContext.tsx` ships to the client for every user regardless of locale. With 4 languages, this becomes ~4× the translation payload for every page.

### Recommendation
- **Memoize `PHASES`** in `how-it-works/page.tsx`: compute once at module level or memoize inside the component.
- **Lazy-load translations**: instead of bundling all languages into `TRANSLATIONS`, load only the active locale's JSON. `next-i18next` already supports this via `resources-to-backend`.
- **Measure**: use `next bundle-analyzer` to confirm translation weight before/after consolidation.

---

## 6. Test Coverage — Zero i18n Tests (Severity: P1)

### Finding
No tests exist for:
- `serverLabels.ts` (lookup, fallback, locale detection)
- `serverLocale.ts` (cookie parsing, invalid cookie handling)
- `LocaleContext.tsx` (locale switching, persistence, `t()` fallback)
- `LanguageToggle.tsx` (UI interaction, cookie update)
- Any Spanish rendering assertions on marketing pages

### Recommendation
**Minimum test matrix before adding more languages:**

| Test | Type | What it proves |
|------|------|----------------|
| `serverLocale.test.ts` | Unit | `getLocale()` returns `'es'` when cookie is `'es'`; falls back to `'en'` on invalid/missing cookie |
| `serverLabels.test.ts` | Unit | `getServerLabel('Apply Now', 'es')` → `'Solicitar Ahora'`; missing key returns original string |
| `LocaleContext.test.tsx` | Unit | `setLocale('es')` updates localStorage + cookie + `document.documentElement.lang` |
| `LanguageToggle.test.tsx` | Component | Selecting Spanish from `<select>` triggers `setLocale` |
| `how-it-works.e2e.ts` | E2E | Spanish cookie → page renders `"Cómo Funciona"` in `<h1>` |

---

## 7. Future Extensibility (Severity: P2)

### Finding
The current architecture has no clear path for:
- **More languages**: French and Portuguese JSON files already exist in `public/locales/`, but the `WAP_LOCALES` array in `LocaleContext.tsx` only accepts `['en', 'es']`. `serverLabels.ts` has no French/Portuguese support at all.
- **Route-based locale** (`/es/how-it-works`): not implemented. Spanish content is invisible to Spanish search queries because URLs don't change.
- **CMS integration**: hardcoded TS objects can't be updated by non-developers.
- **Professional translation workflow**: no `.po`/`.xliff`/`.json` export, no ICU pluralization (`"1 job"` / `"2 jobs"`), no interpolation (`"Hello, {{name}}"`).

### Recommendation
**Roadmap for i18n hardening:**

1. **Week 1: Consolidate stores**
   - Migrate `serverLabels.ts` and `LocaleContext.TRANSLATIONS` into `public/locales/{en,es}/common.json`
   - Create a server-side `loadServerTranslations(locale)` that reads JSON from disk
   - Update `LocaleContext` to load JSON dynamically instead of inlining

2. **Week 2: Stabilize keys**
   - Replace English sentence keys with stable dotted keys (`page.apply.heroTitle`)
   - Add a type-safe key generator (e.g., `t('page.apply.heroTitle')` typed via generated keys from JSON)

3. **Week 3: Add route-based locale (optional but high SEO value)**
   - Middleware rewrite: `/es/*` → `/*` with `locale=es` cookie/header
   - Update `metadata.alternates` to include `hreflang` tags
   - This is a larger lift — defer if bandwidth is tight

4. **Week 4: CMS integration design**
   - Evaluate Crowdin, Lokalise, or Strapi for translation management
   - Document the extraction → translation → import workflow

---

## 8. Failure Modes

| Scenario | Current Behavior | Test Coverage | Error Handling | Silent? |
|----------|-----------------|-------------|--------------|---------|
| Cookie locale = `'fr'` | `LocaleContext` rejects it (not in `WAP_LOCALES`), falls back to `'en'` | None | Yes (guard clause) | No |
| Cookie locale = `'es'` but serverLabels missing key | Returns raw English string | None | Yes (fallback) | **Yes** — user sees mixed English/Spanish |
| `cookies()` throws (static gen) | `getServerLocaleAsync()` catches and returns `'en'` | None | Yes (try/catch) | No |
| `html lang="en"` with Spanish content | Screen reader pronounces Spanish words with English rules | None | N/A | **Yes** — accessibility bug |
| Duplicate key in `SERVER_LABELS_ES` | Build fails (TS1117) | None | N/A | No |

**Critical gap:** Mixed-language UI when a label is missing from `SERVER_LABELS_ES` — no visual indicator, no dev warning, just raw English bleeding through.

---

## NOT in Scope (Deferred)

- **Route-based locale (`/es/*`)** — high value but requires middleware changes and SEO audit; defer to dedicated sprint
- **CMS/professional translation workflow** — depends on store consolidation first
- **ICU pluralization/interpolation** — needed eventually but not blocking Spanish pass
- **French/Portuguese activation** — JSON files exist but server/client wiring is incomplete; defer until Spanish is hardened

---

## What Already Exists (That Should Be Reused)

- `next-i18next.config.js` with 4 locales configured — **underutilized**
- `public/locales/es/common.json` — **not referenced by serverLabels or LocaleContext**
- `i18next` + `react-i18next` + `next-i18next` packages — **only used in 2 components**

The project already has the dependencies for a proper i18n system. The current inline-object approach is a workaround that should be retired.

---

## Action Items (Priority Order)

1. **🔴 Fix duplicate `'How It Works'` in `serverLabels.ts` (line 116)** — blocks build
2. **🔴 Consolidate `getServerLocaleAsync()` + `getLocale()` into one function**
3. **🟡 Set `<html lang={locale}>` dynamically in `RootLayout`**
4. **🟡 Memoize `PHASES` in `how-it-works/page.tsx`**
5. **🟡 Add `prisma generate` to local typecheck workflow**
6. **🟡 Write `serverLocale.test.ts` and `serverLabels.test.ts`**
7. **🟢 Plan consolidation sprint: merge 3 i18n stores into `public/locales/`**
8. **🟢 Add `missingKey` dev warning in `getServerLabel` (log to console in dev)**

---

## Completion Summary

| Section | Findings |
|---------|----------|
| Step 0: Scope Challenge | 3 competing i18n systems; scope accepted as-is for landing Spanish |
| Architecture Review | 3 issues: competing stores, duplicate APIs, no route-based locale |
| Code Quality Review | 3 issues: duplicate TS key, brittle sentence-keys, `PHASES(t)` recreation |
| Test Review | 0 tests for i18n; 5 gaps identified |
| Performance Review | 2 issues: per-page cookie overhead, client bundle bloat from inline translations |
| NOT in scope | Route-based locale, CMS workflow, ICU, French/Portuguese activation |
| What already exists | next-i18next stack installed but underutilized |
| Failure modes | 1 critical gap: missing Spanish keys silently show English |
| Lake Score | 2/2 hardening recommendations chose complete option |

**Status:** DONE_WITH_CONCERNS — Spanish wiring is correct but the foundation needs consolidation before scaling.
