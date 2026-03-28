# WorkforceAP — Master Site Audit
_Date: 2026-03-27 | Auditor: Forge ⚙️_

---

## Summary Scorecard

| Dimension | Score | P0s | P1s | P2s |
|-----------|-------|-----|-----|-----|
| UX/Design | 7/10 | 0 | 3 | 4 |
| SEO/Content | 6/10 | 0 | 4 | 5 |
| Technical/Code | 7/10 | 0 | 2 | 6 |
| Conversion/Funnel | 6/10 | 1 | 3 | 4 |
| Accessibility | 6/10 | 0 | 4 | 5 |

**Overall: 6.4/10 — Functional but several P1 fixes needed before scale.**

---

## 🔴 P0 — Fix Before Any Marketing Push

### CONV-P0-01 | Homepage → Apply | Digital Literacy added to text but NOT to program cards
- **Page:** Homepage hero + Programs section
- **Issue:** Hero subtitle now says "Digital Literacy" first (✅ done today) but the program card grid on homepage may not reflect it as first/prominent card
- **Fix:** Verify Digital Literacy is the first card in the program grid on homepage
- **Impact:** First impression for non-tech visitors — if they see "Cybersecurity" first they bounce

---

## 🟠 P1 — Fix This Sprint

### UX-P1-01 | No skip navigation link
- **Page:** All pages
- **Issue:** No "Skip to main content" link — keyboard users must tab through entire nav on every page
- **Fix:** Add `<a href="#main-content" className="skip-nav">Skip to main content</a>` as first element in layout.tsx
- **Impact:** Accessibility + ADA risk

### UX-P1-02 | Hero image (hero-people.jpg) is 350KB — no WebP version
- **Page:** Homepage
- **Issue:** hero-people.jpg is 350KB JPEG. No WebP fallback. On slow mobile = 2-3s load delay above the fold
- **Fix:** Convert to WebP (target <80KB), use Next.js `<Image>` with `priority` prop
- **Impact:** LCP score, mobile bounce rate

### UX-P1-03 | Logo files bloated (558KB + 443KB)
- **Page:** All pages (nav)
- **Issue:** logo-tight.png = 558KB, logo.png = 443KB — enormous for a logo served on every page
- **Fix:** Export as WebP at 2x max resolution; target <30KB
- **Impact:** Every page load, affects Core Web Vitals

### SEO-P1-01 | OG image is hero-people.jpg — not branded
- **Page:** All pages (social sharing)
- **Issue:** DEFAULT_OG_IMAGE = hero-people.jpg. When shared on LinkedIn/Twitter, shows a photo, not a branded card
- **Fix:** Create a proper OG image (1200x630) with WorkforceAP branding + tagline
- **Impact:** Social sharing CTR

### SEO-P1-02 | "Digital Literacy" not in page title — only in subtitle/meta
- **Page:** Homepage
- **Issue:** Page title doesn't include "Digital Literacy" as a keyword — now it's the anchor offering
- **Fix:** Update title to include "Digital Literacy | Career Training Austin | WorkforceAP"
- **Impact:** SEO ranking for non-tech audience searches

### SEO-P1-03 | No `/sitemap.xml` verified / robots.txt check
- **Page:** Site-wide
- **Issue:** sitemap.ts exists in code but need to verify it's generating correctly and all pages are indexed
- **Fix:** Hit `https://workforceap.org/sitemap.xml` — verify all key pages present
- **Impact:** Google indexing coverage

### SEO-P1-04 | Blog "Read More →" link text is non-descriptive
- **Page:** /blog
- **File:** app/blog/BlogListingClient.tsx:158
- **Issue:** Screen readers read "Read More Read More Read More" — no context
- **Fix:** Change to "Read more about [post title]" or use aria-label
- **Impact:** Accessibility + SEO

### ACCESS-P1-01 | 11 images have empty alt="" (decorative OR missing)
- **Files:** app/leadership/[slug]/page.tsx, app/error.tsx, app/not-found.tsx, app/jobs/[id]/page.tsx, app/jobs/JobsListingClient.tsx, + 6 more
- **Issue:** Leadership photos, job listing images, error page images all have empty alt text
- **Fix:** Add descriptive alt text to content images; empty alt OK only for truly decorative images
- **Impact:** Screen reader users, SEO image indexing

### ACCESS-P1-02 | No skip-nav link anywhere in codebase
- **File:** app/layout.tsx
- **Issue:** Zero skip navigation links — confirmed by grep
- **Fix:** Add skip-nav as first child of `<body>` in layout.tsx
- **Impact:** WCAG 2.1 AA failure — keyboard-only users

### ACCESS-P1-03 | Focus indicators — not verified
- **Issue:** CSS needs review to confirm focus rings are visible (not overridden by `outline: none`)
- **Fix:** Audit `css/main.css` for any `outline: none` or `outline: 0` without replacement
- **Impact:** Keyboard navigation, WCAG 2.1 AA

### ACCESS-P1-04 | Touch targets on mobile — not verified for all CTAs
- **Issue:** Minimum 44x44px touch targets required; small buttons in nav/blog cards need audit
- **Fix:** Add `min-height: 44px; min-width: 44px` to all interactive elements in CSS
- **Impact:** Mobile UX, WCAG 2.5.5

---

## 🟡 P2 — Next Sprint

### UX-P2-01 | AdobeStock watermarked image in production?
- **File:** public/images/AdobeStock_78118914.jpeg (271KB)
- **Issue:** Filename suggests a stock image — verify it's licensed/owned, not a comp with watermark
- **Fix:** Confirm licensing or replace with owned/free image

### UX-P2-02 | favicon.ico.jpg — file naming issue
- **File:** public/images/favicon.ico.jpg
- **Issue:** Favicon stored as JPEG with misleading name — may not render correctly as favicon in all browsers
- **Fix:** Export proper .ico file or use Next.js app/favicon.ico route

### UX-P2-03 | Partner signup page — no social proof
- **Page:** /partner-signup
- **Issue:** Form exists but no context about what partners get, who current partners are, or success stories
- **Fix:** Add 2-3 partner logos + 1 testimonial quote above the form

### UX-P2-04 | /how-it-works exists but unclear if it's linked from nav
- **Page:** /how-it-works
- **Issue:** Page exists but may be buried — non-tech visitors need this as a clear path
- **Fix:** Add "How It Works" to main nav or as a prominent link on homepage

### SEO-P2-01 | WIOA keyword missing from public-facing pages
- **Issue:** "WIOA" appears in internal docs but not on public pages — missing a key search term for workforce development funding
- **Fix:** Add WIOA context to /about or /programs in grant-compliant language

### SEO-P2-02 | No Austin-specific landing pages
- **Issue:** "Austin" appears in meta but no dedicated Austin workforce development landing page
- **Fix:** Create `/austin-workforce-training` page targeting local search

### SEO-P2-03 | Salary Guide page (/salary-guide) — valuable but underlinked
- **Issue:** Great SEO content but if it's not linked prominently it won't rank
- **Fix:** Add salary guide link to homepage and programs pages

### SEO-P2-04 | Blog has career brief content (2 posts visible) — sparse
- **Issue:** Only 2 career brief posts visible; sparse blog = weak SEO signal
- **Fix:** Publish 4-6 more posts targeting "Austin workforce training", "Digital Literacy jobs", "WIOA training Austin"

### TECH-P2-01 | 121 console.log/TODO/FIXME instances in codebase
- **Issue:** Production code has 121 debug statements — performance and info leakage risk
- **Fix:** Remove or replace with proper logging (pino is already in package.json)
- **File:** Run `grep -rn "console\.log" app/ components/ lib/` to get full list

### TECH-P2-02 | dangerouslySetInnerHTML in 4 locations
- **Files:** components/theme/ThemeInitScript.tsx, components/JsonLd.tsx (x2), components/platform/OrgBrandingStyle.tsx, app/layout.tsx
- **Issue:** All appear to use controlled data (JSON schemas, CSS) — low risk but needs review
- **Fix:** Verify none accept user-controlled input; add comments explaining why it's safe

### TECH-P2-03 | Large images not using Next.js Image optimization
- **Files:** Multiple components use `<img>` instead of Next.js `<Image>`
- **Fix:** Migrate to `<Image>` for automatic WebP conversion and lazy loading

### TECH-P2-04 | AdobeStock image in public/ — license risk
- **File:** public/images/AdobeStock_78118914.jpeg
- **Issue:** If this is an unlicensed comp, legal risk
- **Fix:** Verify license or replace immediately

### CONV-P2-01 | Employer flow — unclear value proposition
- **Page:** /employers
- **Issue:** Employers page exists but hiring partners need a clearer "here's what you get" hook
- **Fix:** Add "What employers get" section with specifics (pre-screened candidates, skill-matched, no fee)

### CONV-P2-02 | Find Your Path quiz — verify it leads to apply
- **Page:** /find-your-path
- **Issue:** Quiz exists — verify end state routes to `/apply` with program pre-selected
- **Fix:** Confirm quiz results → Apply CTA is tight and pre-populates program choice

### CONV-P2-03 | No exit intent / email capture
- **Page:** All pages
- **Issue:** No newsletter/notification signup for visitors not ready to apply
- **Fix:** Add "Get program updates" email capture in footer or as soft CTA

### CONV-P2-04 | Partner signup buried — no homepage CTA for orgs
- **Page:** Homepage
- **Issue:** Homepage has "Apply now" for members but partner orgs are less clearly called to action
- **Fix:** Add a "Partner with us" section or CTA block for orgs/employers

### ACCESS-P2-01 | Leadership page images alt="" — named people need descriptions
- **File:** app/leadership/[slug]/page.tsx:71
- **Issue:** Leadership headshots with empty alt text — should be "Photo of [Name], [Title]"
- **Fix:** Pass person name/title to alt attribute

### ACCESS-P2-02 | Job listing images alt="" — job-related images need context
- **File:** app/jobs/JobsListingClient.tsx:74
- **Fix:** Add company name or job title to alt text

---

## ✅ What's Working Well

- **Digital Literacy now first** in hero — good messaging for non-tech audience ✅
- **SEO infrastructure solid** — canonical URLs, OG tags, Twitter cards, JSON-LD schema all in place
- **Apply flow exists** — multi-step with program selection, clear path
- **Programs page** — structured with tracks, Digital Literacy labeled "(1)" = first
- **Salary guide** — strong SEO content asset
- **Program comparison** — Digital Literacy called out as entry point for non-tech visitors
- **Mobile nav** — exists
- **No exposed secrets** — no hardcoded API keys found in client code
- **Console.log minimal in prod** — only 2 in non-test files
- **dangerouslySetInnerHTML** — all controlled data, low risk

---

## Priority Action List (Ordered)

1. ✅ Add skip-nav link to layout.tsx (30 min)
2. ✅ Fix 11 empty alt tags on content images (1 hr)
3. ✅ Verify Digital Literacy is first program card on homepage
4. ✅ Compress logo files + hero image to WebP (1 hr)
5. ✅ Create branded OG image (1200x630)
6. ✅ Update homepage page title to include Digital Literacy
7. ✅ Verify /sitemap.xml is correct
8. ✅ Fix "Read More" link text in blog
9. ✅ Audit for `outline: none` in CSS (focus indicators)
10. ✅ Verify AdobeStock image licensing

---

_Audit artifacts stored in `/home/claw/.openclaw/workspace/projects/workforceap-beta/artifacts/`_
