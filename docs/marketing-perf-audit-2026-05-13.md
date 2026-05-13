# Marketing Site Performance Audit — 2026-05-13

**Scope:** Core Web Vitals focused audit of marketing pages (`/`, `/programs`, `/apply`, `/login`)  
**Context:** Lighthouse previously scored ~45-55. Font optimization (`fd479a13`) recently landed — Inter now subsets to latin with `display: swap`.

---

## Executive Summary

| Page | Raw JS | Raw CSS | Total Critical | LCP Element | Priority Set? |
|------|--------|---------|----------------|-------------|---------------|
| `/` (homepage) | ~791 KB | ~370 KB | ~1.16 MB | Hero `Image` (hero-people.webp) | ✅ Yes |
| `/programs` | ~853 KB | ~370 KB | ~1.22 MB | Hero `Image` (hero-people.webp) | ✅ Yes |
| `/apply` | ~801 KB | ~370 KB | ~1.17 MB | No image LCP (form page) | N/A |
| `/login` | ~746 KB | ~370 KB | ~1.12 MB | CSS background-image | ❌ No |

**The single biggest win:** A 420 KB shared JS chunk (chunk `834`) — heavily Sentry — is loaded on **every page** including lightweight marketing routes. Removing or deferring Sentry from public marketing pages would cut ~35% off the JS payload instantly.

---

## 1. Bundle Analysis

### 1.1 Oversized Shared Chunks

| Chunk | Size | Contents | Severity |
|-------|------|----------|----------|
| `834-*.js` | **420 KB** | Sentry (162 refs) + Next.js runtime | **P0** |
| `4bd1b696-*.js` | **169 KB** | Unknown shared deps (5 Sentry refs) | **P1** |
| `52774a7f-*.js` | **120 KB** | Unknown shared deps (23 Sentry refs) | **P1** |
| `24080-*.js` | **364 KB** | Recharts + Redux (portal-only) | **P1** |
| `144d3bae-*.js` | **460 KB** | Framer Motion + LiveKit + @bufbuild/protobuf | **P1** |
| `main-*.js` | **420 KB** | Next.js main runtime | — |
| `framework-*.js` | **188 KB** | React framework | — |

**Impact:** Marketing pages that never use Recharts, LiveKit, or Framer Motion still pay the download/parse cost because these libraries are bundled into shared chunks consumed by the layout or common graph.

**Recommended fixes:**
- **P0:** Lazy-load Sentry Replay on marketing pages. `instrumentation-client.ts` eagerly imports `@sentry/nextjs` and calls `Sentry.init({ integrations: [Sentry.replayIntegration()] })`. The `enabled` flag is runtime-only; the bundle code still ships. Consider splitting Sentry init into a dynamic `import()` or moving replay to a separate chunk loaded only after interaction.
- **P1:** Recharts (`24080`, 364 KB) is imported by only 3 admin/portal components (`AdminAnalyticsCharts`, `ExecutiveTrendCharts`, `AIEfficacyDashboard`). Wrap those components in `next/dynamic` with `ssr: false` to move Recharts out of the shared graph.
- **P1:** Framer Motion + LiveKit (`144d3bae`, 460 KB) — trace the import path. If it comes from `@elevenlabs/client`, consider lazy-loading the voice/chat features that pull it in.

### 1.2 Duplicate Dependencies

No duplicate React/React DOM versions detected (`npm ls react` shows all deduped to 19.2.4). Clean.

---

## 2. Image Optimization

### 2.1 Public Image Inventory

| Image | Size | Format | Has WebP? | Used with `next/image`? |
|-------|------|--------|-----------|------------------------|
| `hero-people.jpg` | 352 KB | JPEG | ✅ (140 KB) | ✅ Homepage |
| `hero-people.webp` | 140 KB | WebP | — | ✅ Homepage + Programs |
| `AdobeStock_78118914.jpeg` | 272 KB | JPEG | ❌ | ✅ Homepage cards |
| `austin-skyline.jpg` | 192 KB | JPEG | ❌ | ✅ Homepage + Programs |
| `image-asset.jpeg` | 192 KB | JPEG | ❌ | ✅ Homepage cards |
| `michael-brown-ii.png` | 588 KB | PNG | ✅ (84 KB) | ❌ (checked: only .webp used) |
| `logo-tight.png` | 560 KB | PNG | ✅ (104 KB) | ❌ (checked: .webp not referenced) |
| `logo.png` | 444 KB | PNG | ✅ (64 KB) | ❌ (checked: .webp not referenced) |
| `wap_logo.png` | 40 KB | PNG | ❌ | ✅ Nav, Footer, error, not-found |
| `brandon-frye.jpg` | 112 KB | JPEG | ❌ | Unknown |
| `michael-brown.jpg` | 104 KB | JPEG | ❌ | Unknown |

### 2.2 Issues Found

**P1 — Missing WebP alternatives for actively-used images**
- `austin-skyline.jpg` (192 KB) → no WebP
- `AdobeStock_78118914.jpeg` (272 KB) → no WebP
- `image-asset.jpeg` (192 KB) → no WebP

These three are used in homepage program cards. Next.js `Image` will serve them as JPEG even when the browser supports WebP/AVIF, because no source WebP exists to optimize from.

**P1 — CSS background images used instead of `next/image`**
- `/login` — `backgroundImage: 'url(/images/hero-people.webp)'` in `LoginForm.tsx`
- `/employers` — `backgroundImage: 'url(/images/hero-people.webp)'`
- `/what-we-do` — `backgroundImage: 'url(/images/austin-skyline.jpg)'`
- `HeroSection` component — accepts `backgroundImage` prop and renders as CSS background

CSS backgrounds bypass Next.js image optimization entirely: no responsive srcset, no format negotiation, no lazy loading, no `priority` for LCP.

**P2 — `wap_logo.png` dimensions in `next/image` were oversized**
- `MainNav.tsx`, `Footer.tsx`, `error.tsx`, `not-found.tsx` all previously used `width={1930} height={985}`.
- **Fixed:** Reduced to display-size props (`210x107` for nav/footer, `180x92` for error pages). This reduces the generated srcset sizes and prevents the browser from downloading a 1930px-wide image.

### 2.3 LCP Image Audit

| Page | LCP Image | `priority` prop | `sizes` prop | Verdict |
|------|-----------|-----------------|--------------|---------|
| `/` | `hero-people.webp` | ✅ `priority={true}` | ✅ `(min-width: 1921px) 1920px, 100vw` | Good |
| `/programs` | `hero-people.webp` | ✅ `priority` | ✅ `(min-width: 1024px) 500px, 100vw` | Good |
| `/apply` | No image (form page) | N/A | N/A | N/A |
| `/login` | CSS background | ❌ N/A | N/A | **Suboptimal** |

**Note:** The homepage hero image is `fill` mode with `priority`. The `sizes` prop covers large viewports. On mobile, `100vw` is correct.

---

## 3. CSS & Font Audit

### 3.1 CSS Bundle Sizes

| File | Size | Notes |
|------|------|-------|
| `07c67287ced77e6a.css` | **354 KB** | Global layout CSS (includes Material Symbols `@font-face`) |
| `dc0a52a04a471fc7.css` | 56 KB | Portal/admin specific styles |
| `81e96d3bab13c37c.css` | 15 KB | Marketing overrides + mobile bottom nav |
| Others | < 12 KB each | Page-specific chunks |

**P1 — 354 KB global CSS is render-blocking**
- Loaded in `app/layout.tsx` for every route.
- Contains the entire design system (`css/main.css` is 17,000+ lines).
- `experimental.optimizeCss: true` is enabled in `next.config.ts`, but the output is still 354 KB. Lightning CSS may not be aggressively tree-shaking unused utility classes from the custom CSS file.

**Recommendation:** Audit `css/main.css` for dead code. The Tailwind config shows `corePlugins.preflight: false` and the app uses custom CSS as the primary system. Consider splitting `main.css` into:
1. `critical.css` — variables, resets, font-face, nav/footer only (~20-30 KB)
2. `marketing.css` — already exists, loaded separately
3. `portal.css` — already exists, loaded separately

### 3.2 Font Loading

| Font | Method | `font-display` | Subset | Verdict |
|------|--------|----------------|--------|---------|
| Inter | `next/font/google` | `swap` | `latin` | ✅ Good |
| Material Symbols | Self-hosted `@font-face` | `swap` | — | ✅ Good |

**Note:** The Inter font optimization recently landed (`fd479a13`) and is correctly configured.

---

## 4. JavaScript Audit

### 4.1 Third-Party Scripts

| Script | Loading Method | Lazy? | Size Impact |
|--------|---------------|-------|-------------|
| Google Tag Manager (GTM) | Inline `<script>` in `layout.tsx` | ❌ No | ~40-60 KB fetch + execution |
| Vercel Analytics | `@vercel/analytics/next` component | ❌ No | Small (~2-3 KB) |
| Vercel Speed Insights | `@vercel/speed-insights/next` component | ❌ No | Small (~2-3 KB) |
| Sentry | `instrumentation-client.ts` eager import | ❌ No | **~420 KB** |

**P1 — GTM script is render-blocking**
The GTM bootstrap script is inlined in `<body>` and executes immediately. It blocks parsing until the GTM script is fetched.

**Recommendation:** Move GTM to `next/script` with `strategy="lazyOnload"` or `strategy="afterInteractive"`. The `<noscript>` iframe can remain in `<body>`.

**P0 — Sentry is the largest third-party payload**
As noted in §1.1, Sentry Replay integration adds significant weight. Options:
1. Remove `replayIntegration()` from the default init and lazy-load it only after an error occurs.
2. Use `Sentry.lazyLoadReplay()` pattern (if supported by SDK version).
3. Gate Sentry init behind a `window.load` listener for marketing routes.

### 4.2 Hydration Risks

No obvious hydration mismatch patterns detected in the audited pages. The `apply` page uses `Suspense` around `ApplyEligibilityClient`, which is correct for streaming. The `login` page is a lightweight server component that renders `LoginForm` client component — minimal hydration surface.

---

## 5. Page-by-Page Findings

### `/` (Homepage)

- **LCP:** Hero `Image` with `priority` — good.
- **CLS risk:** The hero uses `minHeight: 'min(85vh, 820px)'` and a gradient overlay. The image is `fill` mode. No explicit width/height on the container could cause slight CLS if fonts load slowly, but the `minHeight` provides a stable box.
- **Issue:** Program card images use JPEG sources without WebP alternatives (`AdobeStock_78118914.jpeg`, `austin-skyline.jpg`, `image-asset.jpeg`).
- **Issue:** Credibility bar loads SVG logos (Microsoft, IBM) with `next/image` at small sizes — acceptable.

### `/programs`

- **LCP:** Hero `Image` with `priority` — good.
- **Issue:** `SplitHero` sidebar image is `hero-people.webp` with `fill` and `sizes="(min-width: 1024px) 500px, 100vw"` — correct.
- **Issue:** Loads the same 853 KB JS bundle as homepage. No Recharts/portal code is used on this page, but the shared chunks still ship.

### `/apply`

- **LCP:** No image. Likely the heading text or the first form field.
- **Issue:** Loads `55442-*.js` (14.7 KB) extra chunk vs homepage. The `ApplyEligibilityClient` and `ApplyPageSkeleton` are client components.
- **Issue:** The hero section is a CSS gradient with no image, so LCP should be fast if the JS bundle doesn't block rendering.
- **FID risk:** The form has multiple client components and state. The large JS payload may delay interactivity.

### `/login`

- **LCP:** The brand panel background image (`hero-people.webp` via CSS `backgroundImage`). Cannot set `priority` on CSS backgrounds.
- **Issue:** The image is at 12% opacity behind a gradient — it could potentially be removed entirely or replaced with a tiny CSS gradient to eliminate the image fetch.
- **Issue:** Login is the lightest page (746 KB JS) but still pays the full Sentry + shared chunk tax.

---

## 6. Quick Wins Implemented

| File | Change | Impact |
|------|--------|--------|
| `components/MainNav.tsx` | `width={1930} height={985}` → `width={210} height={107}` | Prevents downloading 1930px-wide srcset for a 210px display |
| `components/Footer.tsx` | `width={1930} height={985}` → `width={210} height={107}` | Same |
| `app/error.tsx` | `width={1930} height={985}` → `width={180} height={92}` | Same |
| `app/not-found.tsx` | `width={1930} height={985}` → `width={180} height={92}` | Same |

---

## 7. Recommendations (Prioritized)

### P0 — High Impact, Low-to-Medium Effort

1. **Defer or split Sentry on marketing routes**
   - The 420 KB Sentry chunk is the #1 opportunity.
   - Option A: Move `Sentry.init()` to a dynamic import in `instrumentation-client.ts`.
   - Option B: Remove `replayIntegration()` from default init; load it on-demand after first error.
   - **Estimated impact:** -350 to -420 KB JS on every page. Could improve Lighthouse Performance by 10-20 points.

2. **Lazy-load Recharts components**
   - Wrap `AdminAnalyticsCharts`, `ExecutiveTrendCharts`, `AIEfficacyDashboard` in `next/dynamic({ ssr: false })`.
   - **Estimated impact:** -364 KB JS removed from marketing pages.

### P1 — Medium Impact, Low-to-Medium Effort

3. **Generate WebP versions of actively-used JPEGs**
   - `austin-skyline.jpg` → `austin-skyline.webp`
   - `AdobeStock_78118914.jpeg` → `AdobeStock_78118914.webp`
   - `image-asset.jpeg` → `image-asset.webp`
   - Update `getHomepageProgramCardImage()` and any other references.
   - **Estimated impact:** -200 to -300 KB image weight on homepage.

4. **Convert CSS background heroes to `next/image`**
   - `/login`, `/employers`, `/what-we-do` all use CSS `backgroundImage` for hero sections.
   - Replace with `<Image fill priority>` inside a relative container.
   - **Estimated impact:** Enables responsive srcset, format negotiation, and `priority` for LCP.

5. **Move GTM to `next/script` with `strategy="lazyOnload"`**
   - **Estimated impact:** Reduces parser-blocking time by ~100-200ms.

6. **Split global CSS into critical + deferred**
   - Extract the true critical path CSS (variables, resets, font-face, nav) from `main.css`.
   - Load the rest asynchronously or via separate imports on portal pages.
   - **Estimated impact:** -200 to -300 KB render-blocking CSS on first paint.

### P2 — Lower Impact, Nice-to-Have

7. **Add `loading="lazy"` to below-the-fold images**
   - Program cards below the fold on `/programs` and `/`.
   - Currently some use default `loading` (Next.js defaults to lazy for non-priority images, so this may already be handled).

8. **Remove unused CSS from `main.css`**
   - 17,000+ lines suggests significant dead code. A manual or automated audit (e.g., PurgeCSS against the content glob) could find unused selectors.

9. **Compress `wap_logo.png`**
   - 40 KB for a 210px display is fine, but a dedicated 180x92 PNG or SVG could be smaller.

---

## 8. Appendix: Raw Chunk Sizes

```
460K  144d3bae-*.js   (Framer Motion + LiveKit)
424K  834-*.js        (Sentry + Next.js runtime)
420K  main-*.js       (Next.js main)
364K  24080-*.js      (Recharts + Redux)
188K  framework-*.js  (React)
172K  8297-*.js       (Supabase auth)
172K  4bd1b696-*.js   (Shared deps)
144K  90930-*.js      (remark + react-markdown)
124K  52774a7f-*.js   (Shared deps)
112K  polyfills-*.js
 84K  app/admin/coursera/page-*.js
 76K  app/(portal)/dashboard/page-*.js
```

---

*Audit generated: 2026-05-13*  
*Auditor: DenchClaw subagent*  
*Repo: `/home/mike/.openclaw-dench/workspace/wap-repo`*
