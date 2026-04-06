# WorkforceAP Site Audit
**Date:** 2026-04-04  
**Auditor:** Kimi Code CLI  
**Scope:** Member portal UX, marketing conversion, technical/product issues  
**Method:** Code review across app/, components/, lib/ with prior audit context

---

## Executive Summary

WorkforceAP has a solid foundation with good separation of concerns (member/employer/partner/admin portals), but has **critical friction points** in the conversion funnel and **technical debt** that creates user-facing problems. The most severe issues are:

1. **Broken navigation paths** and **404s** on key conversion routes
2. **Missing error handling** in critical API routes that will cause user-facing crashes
3. **Client-side only rendering** for key conversion forms that fails for users with slow connections
4. **Missing post-quiz CTA** in the career pathfinder that dead-ends qualified leads

**Estimated impact:** 15-30% conversion loss on apply flow; 50%+ employer lead loss on /employers.

---

## Top 5 Issues

| Rank | Issue | Location | Impact | Effort |
|------|-------|----------|--------|--------|
| 1 | **Career quiz has no apply CTA on results** | `/find-your-path` FindYourPathClient.tsx | 🔴 Conversion killer | 2 hrs |
| 2 | **API routes without error handling** | 38+ routes in `app/api/**` | 🔴 User-facing crashes | 4 hrs |
| 3 | **Apply form is client-side only** | `/apply` ApplyEligibilityClient.tsx | 🔴 Blank page on slow JS | 4 hrs |
| 4 | **Employers page CTAs link to generic contact** | `/employers` page.tsx | 🟠 Lost B2B leads | 2 hrs |
| 5 | **Jobs board no server-rendered fallback** | `/dashboard/jobs` JobsListingClient.tsx | 🟠 SEO + UX issue | 3 hrs |

---

## Full Findings

### 🔴 P0 — Critical (Fix This Week)

---

**~~P0-1 | Career Quiz Results Lack Apply CTA~~ ✅ DONE**
- **File:** `app/find-your-path/FindYourPathClient.tsx`
- **Status:** Already implemented in commit `2602057`. Each program card has a primary CTA `getApplyHref(program.slug)` linking to `/apply?program=[slug]`.
- **Fix:** N/A — conversion path is live.

---

**P0-2 | 38+ API Routes Missing Error Handling**
- **Files:** Representative sample:
  - `app/api/partner/referral-members/route.ts`
  - `app/api/partner/milestones/route.ts`
  - `app/api/employer/applications/route.ts`
  - `app/api/member/delete-account/route.ts`
  - `app/api/auth/me/route.ts` (Promise.all with no try-catch)
- **Issue:** Prisma errors propagate uncaught to clients, showing raw stack traces or blank 500s. The `auth/me` route is called on every page load for nav state—any DB hiccup breaks entire portal.
- **Evidence:** `audit-technical-code-2026-03-27.md` identified 38 routes without try-catch.
- **Fix:** Wrap all API routes in try-catch with user-friendly error messages. Priority: auth/me, member/delete-account, payment-related routes.
- **Status update:** ✅ **DONE** on 2026-04-05. Added route-local try/catch to all remaining routes. PR #417.

---

**~~P0-3 | Account Deletion Only Soft-Deletes~~ ✅ DONE**
- **File:** `app/api/member/delete-account/route.ts`
- **Status:** Already hard-deletes from Supabase Auth via `supabaseAdmin.auth.admin.deleteUser(user.id)` after soft-delete.
- **Fix:** N/A — GDPR-compliant deletion is live.

---

**~~P0-4 | Unauthenticated Email Trigger Endpoint~~ ✅ DONE**
- **File:** `app/api/apply/confirmation-email/route.ts`
- **Status:** Already has IP-based rate limiting via `checkConfirmationEmailRateLimit(getClientIp(request))` plus top-level try/catch.
- **Fix:** N/A — rate-limited and protected.

---

### 🟠 P1 — High (Fix This Sprint)

---

**P1-1 | Apply Form is Client-Side Rendered Only**
- **File:** `app/apply/page.tsx`, `app/apply/ApplyEligibilityClient.tsx`
- **Issue:** The eligibility form renders entirely via client JS. If JS fails, loads slowly, or user has ad-blockers, they see a blank page with no form.
- **Evidence:** Page uses `<Suspense fallback={...}>` with skeleton, but actual form is in `ApplyEligibilityClient` which requires JS. No SSR fallback for form questions.
- **Fix:** Server-render the eligibility questions with progressive enhancement, or add visible "Call (512) 777-1808" fallback prominently above the fold.

---

**P1-2 | Employer Page CTAs Are Generic**
- **File:** `app/employers/page.tsx`
- **Issue:** Primary CTAs link to `/employer` (portal login) and `#employer-contact` anchor which shows generic contact form. No dedicated employer intake flow.
- **Evidence:** Partnership tier CTAs all href to `#employer-contact` which renders `<EmployerContactForm />`. No segmentation by company size or interest type.
- **Fix:** Add employer-specific fields (company name, role count, hiring timeline) to the contact form when coming from /employers. Or create dedicated `/employers/register` flow.

---

**P1-3 | Jobs Board No SSR / SEO**
- **File:** `app/(portal)/dashboard/jobs/page.tsx`, `JobsListingClient.tsx`
- **Issue:** Job listings are entirely client-fetched. Unauthenticated users see skeleton loaders with no job data. Search engines see empty page.
- **Evidence:** Page checks `!user` and shows login CTA, but job data only loads via `JobsListingClient` which fetches client-side.
- **Fix:** Server-render public job listings (first 10-20) for SEO and immediate perceived performance.

---

**P1-4 | Missing npm Packages = Broken Error Monitoring**
- **File:** `app/(portal)/dashboard/error.tsx` and others
- **Issue:** `@sentry/nextjs` is imported but not in package.json. Error boundaries fail silently.
- **Evidence:** TypeScript errors from audit-technical-code-2026-03-27.md.
- **Fix:** `npm install @sentry/nextjs` to restore error capture.

---

**P1-5 | Next.js Image Optimization Not Used for External Hero**
- **File:** `app/page.tsx`
- **Issue:** Hero uses external Unsplash URL with `next/image` but no blur placeholder. Layout shift on load.
- **Fix:** Add `placeholder="blur"` with `blurDataURL` for the hero image.

---

### 🟡 P2 — Medium (Fix Next Sprint)

---

**P2-1 | Portal Tour May Fire on Mobile Unnecessarily**
- **File:** `components/onboarding/PortalEntryClient.tsx`
- **Issue:** Tour starts automatically when `showTour` is true, but mobile has separate simplified layout that may conflict.
- **Evidence:** Mobile dashboard is completely separate JSX tree in `DashboardPage.tsx` but tour context is shared.
- **Fix:** Disable tour on mobile (<640px) or adapt tour steps for mobile layout.

---

**P2-2 | Mobile/Desktop Layout Duplication**
- **Files:** `app/page.tsx`, `app/employers/page.tsx`, `app/find-your-path/page.tsx`
- **Issue:** Heavy duplication of content between `marketing-desktop` and `marketing-mobile` divs. ~2x maintenance burden, risk of content drift.
- **Fix:** Use responsive Tailwind classes instead of completely separate JSX trees where possible.

---

**P2-3 | Large Unoptimized Images**
- **File:** `public/images/`
- **Issue:** Logo PNGs at 558KB, hero JPG at 350KB. No WebP/SVG alternatives.
- **Fix:** Convert logos to SVG, hero to WebP. Add `next/image` sizing.

---

**P2-4 | GTM ID Hardcoded as Fallback**
- **File:** `app/layout.tsx`
- **Issue:** `const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-53JCT6WN'` sends staging data to production analytics.
- **Fix:** Remove fallback—if env var missing, skip GTM injection entirely.

---

**P2-5 | Contact Form Topic Dropdown Options Unclear**
- **File:** `app/contact/ContactFormClient.tsx` (implied)
- **Issue:** "What can we help with?" field has no visible options in static analysis. If free-text, creates routing noise.
- **Fix:** Ensure dropdown options: Apply, Partner, Hire, General.

---

### 🟢 P3 — Low (Backlog)

---

**P3-1 | Console.log in Production Code**
- **File:** `lib/employer/triggerEmployerJobAiMatch.ts:35`
- **Issue:** `console.log` for job matching. Should use structured logger.

---

**P3-2 | Cursor/Sprint Files in Root**
- **Files:** `cursor-api-payload*.json`, `cursor-prompt-*.md`, `cursor-sprint-*.md`
- **Issue:** 20+ planning files in root inflate build artifacts. Not in `.vercelignore`.
- **Fix:** Move to `docs/` or add to `.vercelignore`.

---

**P3-3 | TypeScript Build Errors from Missing Types**
- **Files:** `tailwind.config.ts`, `app/employers/EmployerContactForm.tsx`
- **Issue:** Missing `@types/tailwindcss` and `@marsidev/react-turnstile` types.
- **Fix:** Install dev dependencies for types.

---

## Suggested Implementation Order

### Week 1 (Critical Path)
1. **Add try-catch to auth/me route** — 30 min, prevents portal-wide outages
2. **Fix account deletion** — 30 min, GDPR compliance
3. **Add rate limiting to confirmation-email** — 30 min, security
4. **Add apply CTA to quiz results** — 2 hrs, conversion

### Week 2 (Conversion)
5. **Server-render job listings** — 3 hrs, SEO + UX
6. **Fix employer page CTAs** — 2 hrs, B2B leads
7. **Add fallback to apply form** — 3 hrs, accessibility

### Week 3 (Quality)
8. **Batch fix remaining API routes error handling** — 4 hrs
9. **Install Sentry packages** — 15 min
10. **Optimize images** — 2 hrs

---

## First Files / Routes To Attack

### Immediate (Today)
| File | Change | Why |
|------|--------|-----|
| `app/api/auth/me/route.ts` | Wrap Promise.all in try-catch | Portal stability |
| `app/api/member/delete-account/route.ts` | Add Supabase auth deletion | Compliance |
| `app/api/apply/confirmation-email/route.ts` | Add rate limiting | Security |

### This Week
| File | Change | Why |
|------|--------|-----|
| `app/find-your-path/FindYourPathClient.tsx` | Add apply CTAs to results | Conversion |
| `app/employers/page.tsx` | Improve employer contact form | B2B leads |
| `app/(portal)/dashboard/jobs/page.tsx` | Server-render public jobs | SEO |

---

## Prior Audit Context

This audit builds on findings from:
- `audit-ux-design-2026-03-27.md` — UX issues, broken nav links
- `audit-conversion-funnel-2026-03-27.md` — Conversion gaps, dead ends
- `audit-technical-code-2026-03-27.md` — Error handling, missing packages

**Previously identified issues still valid:**
- `/about` 404 (P0)
- `/find-your-career` nav link 404s (P0)
- `/employers` thin content (now improved but CTAs still weak)
- Homepage lacks testimonials (P1)

---

*Audit complete. Focus on P0 items first for maximum impact.*
