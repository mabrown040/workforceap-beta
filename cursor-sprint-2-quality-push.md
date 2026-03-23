# WorkforceAP Sprint 2 — Site Quality & Score Push
**For:** Cursor Cloud Agent  
**Repo:** mabrown040/workforceap-beta  
**Branch:** master  
**Date:** 2026-03-23  
**Context:** squirrelscan audit baseline 63/100. Sprint 1 fixed accessibility, SEO, favicon, LinkedIn URL, sitemaps. Sprint 2 targets 85+ with content, canonical, heading, and design improvements.

---

## Objective
Push squirrelscan score from current ~75 (post Sprint 1) to **85+ (Grade B)**. Fix all remaining HIGH-severity SEO and design findings. All changes to master branch, one atomic commit per fix.

---

## P1 — SEO Score Blockers

### P1-1: Apply pages — add real program-specific value prop content
**Problem:** `/apply?program=*` pages are flagged for thin content (184 words, min 300) and keyword stuffing. All 20 pages share the same generic copy.

**Fix:** In `app/apply/page.tsx`, read the `program` query param. If it matches a known program slug from `lib/content/programs.ts`, render a program-specific block above the eligibility checker that includes:
- Program title and certifying body (e.g., "Google Cybersecurity Certificate")
- 2-3 bullet points from the program's `skills` array
- Salary outcome range (from `lib/content/programSalaryOutcomes.ts` if available, otherwise from programs.ts)
- A unique meta title: `Apply for [Program Name] — Free Career Training | WorkforceAP`
- A unique meta description incorporating the program name and cert

If no program param is provided, show the existing generic apply page.

**Files:** `app/apply/page.tsx`, `lib/content/programs.ts`
**Commit:** `fix(seo): add program-specific content blocks to /apply?program= pages — fixes thin content and duplicate title/desc`

---

### P1-2: Unique meta titles and descriptions for /apply?program= pages
**Problem:** 34 pages share identical `<title>Apply for Free Career Training - Workforce Advancement Project</title>` and identical `<description>`.

**Fix:** In `app/apply/page.tsx`, use `generateMetadata` with dynamic program data:
```
title: `Apply for [Program Title] Training — WorkforceAP`
description: `Get free [Program Title] training with [Cert Name] from WorkforceAP. No-cost career certification in [field]. Apply in 10 minutes.`
```
Fall back to generic if no program param.

**Commit:** `fix(seo): generate unique meta title and description per apply?program= page`

---

### P1-3: Canonical URLs for parameterized pages
**Problem:** `/apply?program=*` and `/program-comparison?compare=*` pages don't have canonical URLs, risking duplicate content penalties.

**Fix:**
- For `/apply?program=[slug]`: set canonical to `/apply?program=[slug]` (each variant is valid)
- For `/program-comparison?compare=[slugs]`: set canonical to `/program-comparison` (base page, comparisons are transient)

In `app/apply/page.tsx` use `alternates.canonical` in `generateMetadata`.
In `app/program-comparison/page.tsx` add `alternates: { canonical: '/program-comparison' }` to metadata.

**Commit:** `fix(seo): add canonical URLs to apply and program-comparison parameterized pages`

---

### P1-4: Remove rich schema from noindex pages
**Problem:** squirrelscan flagged 3 pages with rich schema + noindex — the schema is ignored by Google but flagged as a conflict.

**Fix:** Find the 3 pages (likely `/login`, `/employer`, `/login?redirectTo=`). These are auth-gated and correctly set to `robots: noindex`. Remove any JSON-LD structured data from these pages only. Do NOT change their noindex status.

Check `app/(auth)/login/page.tsx` and `app/(portal)/employer/page.tsx` for structured data references.

**Commit:** `fix(crawl): remove structured data from noindex auth pages — fixes schema/noindex conflict`

---

### P1-5: Add internal links to orphaned program pages
**Problem:** 23 program pages have only 1 internal link. This hurts crawlability and PageRank.

**Fix:** In `app/programs/[slug]/page.tsx`, at the bottom of each program detail page, add a "Related Programs" section. Use the existing `PROGRAMS` array from `lib/content/programs.ts` to find 2-3 programs in the same category or with overlapping skills. Render as a small card grid with links to `/programs/[slug]`.

Also verify that `app/programs/page.tsx` links to each program's detail page — if the grid only links to `/apply?program=[slug]` and not `/programs/[slug]`, add the detail page link.

**Commit:** `fix(crawl): add related programs section to program detail pages — fixes 23 orphaned pages`

---

### P1-6: Fix heading hierarchy on apply and comparison pages
**Problem:** squirrelscan detected H2→H4 and H1→H4 heading jumps on 53 pages.

**Fix:** Audit `app/apply/ApplyEligibilityClient.tsx`, `app/apply/ApplyFlowClient.tsx`, and `app/program-comparison/ProgramComparisonClient.tsx`. Change any `<h4>` that follows directly after `<h2>` or `<h1>` (without an intervening `<h3>`) to `<h3>`. Do not change visual styling — only the semantic heading level.

**Commit:** `fix(a11y): fix heading hierarchy H2→H4 jumps on apply and comparison pages`

---

## P2 — Design Polish

### P2-1: Replace homepage 3-column feature grid with mission outcome flow
**Problem:** The "For you, if you're ready to launch" section uses a classic AI-generated 3-column icon+title+description grid (Industry Certs | Loaner Laptop | Job Placement). This is the most recognizable AI layout pattern and undermines credibility.

**Fix:** Redesign this section as a **horizontal outcome journey** — 4 steps showing what participants receive in sequence:
1. Loaner Laptop (gear icon) → "Start equipped, not behind"
2. Career Training (graduation icon) → "Industry certs from Google, IBM, AWS"
3. Job Placement (briefcase icon) → "Employer-aligned placements"
4. 90-Day Support (handshake icon) → "Support after you're hired"

Render as a horizontal step-flow on desktop (connector line between steps) and vertical stack on mobile. No card borders. Each item: icon + bold outcome + 1-line description.

**Files:** `app/page.tsx`, `css/main.css`
**Commit:** `style(design): replace 3-col AI slop feature grid with horizontal outcome journey flow`

---

### P2-2: Apply page — lighten callout visual weight
**Problem:** Dark hero immediately followed by a gray "Where we operate today" callout creates a visual wall before the form.

**Fix:** Replace the gray callout box styling with a lighter treatment: white background, green left border (use `--color-accent`), and reduce vertical padding. Or convert to an inline badge-style element instead of a block.

**Files:** `app/apply/page.tsx`, `css/main.css`
**Commit:** `style(design): lighten apply page location callout — reduces visual weight before form`

---

### P2-3: Leadership "FOUNDER" badge positioning
**Problem:** The FOUNDER badge on Michael Brown's leadership card overflows the photo container differently than expected.

**Fix:** In `css/main.css` (leadership section), ensure the FOUNDER badge is `position: absolute` with `top: 0.75rem; left: 0.75rem` relative to the card container (not the photo). The card wrapper needs `position: relative`.

**Commit:** `style(design): fix FOUNDER badge positioning on leadership card`

---

### P2-4: Blog post thumbnails — add fallback image system
**Problem:** Every blog post shows the WorkforceAP logo as thumbnail. In the listing grid, this is visually repetitive and low-trust.

**Fix:**
1. Add optional `heroImage` field to `BlogPost` in `prisma/schema.prisma` (nullable String).
2. Add migration: `prisma migrate dev --name add_blog_hero_image`
3. In `app/blog/BlogListingClient.tsx`, render `heroImage` if present. If null/empty, use a category-based fallback image from `/public/images/` (e.g., `blog-default-tech.jpg`, `blog-default-careers.jpg`). For now, a single default OG image is acceptable.
4. Seed 2-3 existing blog posts with hero images if you can identify appropriate Unsplash URLs.

**Files:** `prisma/schema.prisma`, migration, `app/blog/BlogListingClient.tsx`
**Commit:** `feat(blog): add heroImage field to BlogPost — replaces logo placeholder in listing grid`

---

## P3 — Performance & Security

### P3-1: Investigate /blog TTFB (1343ms)
**Problem:** squirrelscan measured 1343ms TTFB on /blog — classified as "very slow server response."

**Fix:** In `app/blog/page.tsx` (or the blog listing server component), check:
1. Is this a dynamic render with an uncached DB query on every request?
2. Add `export const revalidate = 3600` (1-hour ISR cache) if not already present
3. If using `prisma.blogPost.findMany`, confirm it's not loading unused relations
4. Add the `{ cache: 'force-cache' }` or use Next.js `unstable_cache` wrapper if needed

**Commit:** `fix(perf): add ISR revalidation to /blog listing page — reduces TTFB`

---

### P3-2: Add Cloudflare Turnstile to employer contact form
**Problem:** The employer contact form is a public spam target with no CAPTCHA. squirrelscan flagged it.

**Fix:**
1. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to `.env.example`
2. Install `@marsidev/react-turnstile`
3. Add the `<Turnstile>` widget to `EmployerContactForm.tsx` — render it before the submit button
4. In `/api/contact` (or the form submission handler), verify the token server-side via `https://challenges.cloudflare.com/turnstile/v0/siteverify`
5. Return 400 if token verification fails

If Turnstile keys are not yet configured, add a `NEXT_PUBLIC_CAPTCHA_ENABLED` env flag that disables the widget when false (safe for dev).

**Files:** `app/employers/EmployerContactForm.tsx`, relevant API route, `.env.example`
**Commit:** `feat(security): add Cloudflare Turnstile CAPTCHA to employer contact form`

---

## Definition of Done

After all changes:
1. `npm run build` must pass with zero errors
2. Push all commits to master
3. Run: `squirrel audit https://workforceap.org --format llm --coverage surface` and confirm score ≥ 85
4. Verify Vercel deployment is live and /apply?program=cybersecurity-professional-certificate-google shows unique title + content
5. Verify /blog shows non-logo thumbnails (or consistent fallback)
6. Verify /programs/[any-slug] page shows "Related Programs" section

---

## Commit Format
One atomic commit per fix. Format: `fix(category): short description` or `feat(category): description` or `style(design): FINDING-XXX — description`

## Important
- Read files before editing
- Do not modify the Prisma migration history — only add new migrations
- Do not change existing test files
- `npm run build` must pass after every commit
- If any task is ambiguous, implement the simpler/safer interpretation and note it in the commit message
