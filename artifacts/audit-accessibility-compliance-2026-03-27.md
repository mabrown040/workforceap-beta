# WorkforceAP Accessibility & Compliance Audit
**Date:** 2026-03-27  
**Auditor:** Forge ⚙️  
**Site:** https://workforceap.org  
**Codebase:** `/home/claw/.openclaw/workspace/projects/workforceap-beta`

---

## Audit Scope
- WCAG 2.1 AA compliance (color contrast, keyboard nav, screen reader)
- Alt text on images
- Form labels and error messages
- Focus indicators
- Skip navigation links
- ARIA roles and landmarks
- Heading hierarchy
- Link text quality
- Mobile touch targets
- WIOA compliance language
- Privacy policy and terms completeness
- ADA compliance risks

---

## Priority Legend
- **P0** — Critical / ADA lawsuit risk / must fix immediately
- **P1** — High / WCAG 2.1 AA failure / fix before launch
- **P2** — Medium / best practice violation / fix soon
- **P3** — Low / nice-to-have improvement

---

## Summary Scorecard

| Category | Status | Severity |
|---|---|---|
| Skip navigation | ✅ Implemented | — |
| ARIA roles & landmarks | ✅ Mostly good | P2 gaps |
| Focus indicators | ⚠️ box-shadow only | P1 (High Contrast mode) |
| Alt text — decorative images | ✅ Correct (empty alt) | — |
| Alt text — content images | ✅ Mostly descriptive | P2 one pattern gap |
| Form labels | ⚠️ Admin wizard unlabeled | P1 |
| Form error messages | ✅ role=alert + aria-describedby | — |
| Heading hierarchy | ✅ Passes | P3 minor |
| Color contrast | ✅ Passes AA | P2 dark mode |
| Touch targets | ⚠️ btn-sm below 44px | P2 |
| WIOA language | ✅ Present | P2 public visibility |
| Privacy policy | ✅ Comprehensive | P2 missing items |
| Terms of service | ✅ Present | P2 missing items |
| ADA compliance | ⚠️ Multiple P1 risks | P1 |

---

## Findings

---

### P1 — HIGH PRIORITY

---

#### P1-001 | `outline: none` Without High-Contrast Fallback
**Pages:** All (global CSS)  
**Element:** All focusable elements — buttons, inputs, links, form fields, job cards  
**File:** `css/main.css` (lines 501, 1061, 1486, 1501, 1516, 3662, 5863, 11038, 11080), `app/leadership/leadership.css` (line 178)  

**Issue:** All focus styles use `outline: none` + `box-shadow` as a replacement. While `box-shadow` provides a visible ring in standard browsers, it is **completely invisible in Windows High Contrast Mode** (used by ~1.5M users with visual disabilities). WCAG 2.4.11 (Focus Appearance, AA) requires focus indicators to be visible. This is a systemic risk.

**Fix:**
```css
/* Replace pattern: */
:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-accent);
}

/* With: */
:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 2px;
    box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-accent);
}
```

---

#### P1-002 | Admin Member Wizard — Form Inputs Missing `id`/`htmlFor` Association
**Page:** `/admin/members/new`  
**Element:** All inputs in `AddMemberWizard.tsx` (First Name, Last Name, Email, Phone, Address, Date of Birth)  
**File:** `app/admin/members/new/AddMemberWizard.tsx` (lines 231–251)  

**Issue:** Labels exist but have **no `htmlFor` attribute** and inputs have **no `id`**. Screen readers cannot programmatically associate labels with their fields. This fails WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value).

```tsx
// Current — broken for screen readers
<label>First Name *</label>
<input type="text" value={form.firstName} ... />

// Fix
<label htmlFor="wizard-first-name">First Name *</label>
<input id="wizard-first-name" type="text" value={form.firstName} ... />
```

**Affected fields:** firstName, lastName, email, phone, address, dob (6 inputs total)

---

#### P1-003 | Job Import Form — Unlabeled Inputs
**Page:** `/employer/jobs/import`  
**Element:** URL input, textarea for job description, bulk URL textarea, careers page paste textarea  
**File:** `app/(portal)/employer/jobs/import/ImportJobClient.tsx` (lines 352–369)  

**Issue:** Multiple `<input>` and `<textarea>` fields have **no associated `<label>`** — only placeholder text. Placeholders disappear on input and are not a valid substitute for labels (WCAG 1.3.1, 2.5.3). Screen readers will announce only the placeholder (or nothing) as the accessible name.

**Fix:** Add explicit `<label htmlFor>` for each field, or at minimum `aria-label` attributes.

---

#### P1-004 | Admin Employers Form — Missing Label Associations
**Page:** `/admin/employers/new`  
**Element:** Email input  
**File:** `app/admin/employers/CreateEmployerAccountClient.tsx` (line 199)  

**Issue:** `<input type="email">` has no visible `<label>` or `aria-label` in the surrounding context. WCAG 1.3.1.

---

### P2 — MEDIUM PRIORITY

---

#### P2-001 | `btn-sm` Below 44px Minimum Touch Target
**Pages:** Multiple — anywhere `btn-sm` or `btn-small` classes are used  
**File:** `css/main.css` (lines 1544–1547, 7128)  

**Issue:** `.btn-sm` and `.btn-small` both specify `min-height: 36px`, below the WCAG 2.5.5 recommended 44×44px touch target and Apple/Google mobile guidelines. On mobile this creates tapping difficulty, especially for motor-impaired users.

**Fix:** Increase to `min-height: 44px` or use padding to meet 44px tap area. If visual size must stay small, use a transparent padding trick with `padding: 4px` + larger invisible hit area.

---

#### P2-002 | Focus Indicator Color Contrast on White Backgrounds
**Pages:** All  
**File:** `css/main.css`  

**Issue:** Some focus ring combinations use `box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-accent)` where the outer ring is `--color-accent: #ad2c4d`. On white backgrounds this gives a 2px white gap before the red ring. While this works visually, WCAG 2.4.11 requires the focus area to have 3:1 contrast against adjacent color — the white gap reduces the effective contrast. Recommend testing with axe DevTools.

---

#### P2-003 | Dark Mode — `color-gray-500` (#737373) on Dark Backgrounds
**Pages:** Any page with dark mode enabled  
**File:** `css/main.css` (dark theme overrides)  

**Issue:** In dark mode, several secondary/subtitle text elements use `color: var(--color-gray-500)` which resolves to `#737373` by default (though overridden to `#9ca3af` in dark mode remaps). If the dark mode remap is not applied consistently, `#737373` on a dark background (`#161a1f`) has very low contrast. Need to verify the dark mode token is applied everywhere `--color-gray-500` is used in dark contexts.

**Fix:** Audit all `html.dark` rules and ensure `color-gray-500` text always uses the remapped `#9ca3af` value, not the `:root` value `#737373`.

---

#### P2-004 | Heading Hierarchy — Multiple `<h2>` Landmarks on Homepage
**Page:** `/` (homepage)  
**File:** `app/page.tsx`  

**Issue:** The homepage has multiple sequential `<h2>` sections without intervening context: "Your Journey With Us", "25+ Years Breaking Barriers", and "Your Next Step" all appear as `<h2>` elements in flat sequence after sections using `<h3>` subsections. While not a direct WCAG failure, it creates a confusing document outline for screen reader users navigating by headings. WCAG 1.3.1 best practice.

**Fix:** Review heading hierarchy. The "25+ Years Breaking Barriers" stat block should likely be `<p>` or `<h3>` since it's a subsection of the social proof section.

---

#### P2-005 | Privacy Policy — Missing CCPA/State Consumer Rights Section
**Page:** `/privacy`  
**File:** `app/privacy/page.tsx`  

**Issue:** The privacy policy covers GDPR-aligned rights (access, correction, deletion, portability) but does not include:
- California CCPA/CPRA language (right to opt out of sale/sharing)
- State-specific rights disclosure (Texas, Virginia, Colorado have state privacy laws)
- Cookie consent mechanism (GTM is loaded unconditionally; no banner/consent gate)
- Clear distinction between "sale" vs "sharing" of data per CCPA 2023 amendments

**Fix:** Add a "State Consumer Privacy Rights" section. Implement cookie consent before GTM fires (the iframe noscript fires GTM unconditionally; the script tag also fires before any consent).

---

#### P2-006 | Privacy Policy — GTM Loaded Without Consent Gate
**Page:** All (root layout)  
**File:** `app/layout.tsx` (lines ~60–70)  

**Issue:** Google Tag Manager script is injected directly in `<body>` without any consent check. Under GDPR (if serving EU users) and emerging US state privacy laws (CCPA opt-out), analytics tracking should not fire before user consent. The `<noscript>` iframe also loads GTM without gating.

**Fix:** Integrate a consent management platform (CMP) or at minimum conditionally load GTM only after consent is given.

---

#### P2-007 | Terms of Service — Missing Dispute Resolution / Arbitration Clause
**Page:** `/terms`  
**File:** `app/terms/page.tsx`  

**Issue:** The Terms of Service lacks:
- Dispute resolution / arbitration agreement
- Class action waiver
- Governing law / jurisdiction clause
- WIOA participant rights and grievance procedures (required for programs using federal workforce funding)

**Fix:** Add legal sections for governing law, dispute resolution, and WIOA participant rights/grievance notice.

---

#### P2-008 | WIOA Compliance Language — Not Publicly Visible
**Page:** Public-facing program pages  
**File:** `app/partners/page.tsx`, `app/admin/members/new/page.tsx`  

**Issue:** WIOA references appear only in the admin interface and a single line in the partners page. For programs receiving WIOA/federal workforce funding:
- Participants must be notified of their rights under WIOA Section 188 (Equal Opportunity / nondiscrimination)
- A public EO Notice must be displayed (federally required)
- Programs must post "Equal Opportunity is the Law" statement

**Fix:** Add an EO/WIOA nondiscrimination notice to the Apply flow, program pages footer, and Terms.

---

#### P2-009 | Missing `lang` Attribute on Some Dynamic Pages
**Page:** Portal pages rendered outside root layout  
**File:** `app/layout.tsx` (root layout has `lang="en"` ✅), but portal layouts should verify inheritance  

**Issue:** Root layout correctly sets `<html lang="en">`. However, verify that portal-specific layouts (under `app/(portal)/`) don't override or omit the `lang` attribute if they render their own `<html>` tag.

**Status:** Root layout is correct. Low risk but worth confirming no nested HTML tags override it.

---

### P3 — LOW PRIORITY

---

#### P3-001 | Decorative Logo Images — Empty Alt is Correct but Consider Org Name Context
**Pages:** Portal pages, employer settings, org branding bar  
**Files:** `components/platform/OrgBrandingBar.tsx`, `components/portal/WorkspaceShell.tsx`, `components/employer/EmployerSettingsForm.tsx`  

**Issue:** Logo images in branding contexts use `alt=""` (decorative treatment). This is technically correct when the org name is present in nearby text. However, if the logo is the **only** identifier of the organization in that UI region (e.g., `WorkspaceShell` top bar), an empty alt leaves screen reader users without context.

**Fix:** Conditionally provide `alt={`${orgName} logo`}` when the org name is not announced by adjacent text.

---

#### P3-002 | Blog Post Cover Images — Generic Alt Text Pattern
**Page:** `/blog`, `/blog/[slug]`  
**File:** `app/blog/BlogListingClient.tsx`  

**Issue:** Blog cover images use the pattern `alt={post.title ? \`Cover image for ${post.title}\` : 'Blog post cover image'}`. "Cover image for X" is redundant — the heading already announces the title. Screen readers will announce the title twice.

**Fix:** Use `alt=""` (decorative) for cover images that are purely decorative alongside a visible heading, OR use a descriptive alt describing the actual image content.

---

#### P3-003 | Job Detail Page — Company Logo Alt Empty
**Page:** `/jobs/[id]`  
**File:** `app/jobs/[id]/page.tsx` (line 66), `app/jobs/JobsListingClient.tsx` (line 74)  

**Issue:** Company logos in job cards use `alt=""`. If the company name is not announced by adjacent text in the card context, this loses context. Review whether company name appears as visible text near each logo.

**Fix:** Use `alt={`${companyName} logo`}` when the logo is the primary brand identifier in the card.

---

#### P3-004 | Error / 404 Pages — Empty Alt on Illustration
**Pages:** `/error`, `/not-found`  
**Files:** `app/error.tsx`, `app/not-found.tsx`  

**Issue:** Illustrations on error and 404 pages use `alt=""`. This is correct for purely decorative images, but verify these images don't convey meaning (e.g., if they show an action/instruction). If purely decorative, ✅ no fix needed.

---

#### P3-005 | Leadership Page CSS — `outline: none` Without Fallback Pattern
**File:** `app/leadership/leadership.css` (line 178)  
**Element:** `.leader-card-linkedin:focus-visible`  

**Issue:** Uses `outline: none` + `box-shadow` pattern (same as P1-001 global issue). Already flagged in P1-001 but calling out the separate CSS file as it may be missed in a global fix.

---

#### P3-006 | `<nav>` Elements — Some Missing `aria-label`
**Pages:** `/leadership/[slug]` (has aria-label ✅), `/login` (has aria-label ✅), dashboard pages  
**Issue:** Some `<nav>` elements in portal pages lack `aria-label`, which means if multiple `<nav>` elements exist on a page, screen reader users see "navigation" multiple times in the landmark list. WCAG 2.4.1 best practice.

**Fix:** Add unique `aria-label` to all `<nav>` elements (e.g., `aria-label="Breadcrumb"`, `aria-label="Main navigation"`).

---

## Positive Findings (Already Implemented Correctly)

These items were verified and are in good shape:

| Item | Status | Notes |
|---|---|---|
| Skip navigation link | ✅ | `app/layout.tsx` — `<a href="#main-content" className="skip-link">` present |
| `<html lang="en">` | ✅ | Root layout correct |
| `<main id="main-content">` | ✅ | Root layout has landmark |
| Apply form radio buttons | ✅ | Uses `<fieldset>`, `<legend>`, `role="group"`, `aria-describedby` errors |
| Login form | ✅ | `htmlFor`, `aria-describedby`, `role="alert"` error, show/hide password `aria-label` |
| Contact form | ✅ | Full `htmlFor`/`id` matching, `aria-describedby` on errors |
| Icon elements | ✅ | `aria-hidden` correctly applied on Lucide icons |
| `sr-only` utility class | ✅ | Defined in CSS for screen-reader-only text |
| Touch target minimum (primary buttons) | ✅ | `min-height: var(--touch-target-min)` = 48px on `.btn` |
| Privacy policy existence | ✅ | Comprehensive 10-section policy at `/privacy` |
| Terms of service existence | ✅ | 10-section ToS at `/terms` |
| `aria-label` on employer section | ✅ | `aria-label="Company profile form"` |
| Blog image alt text | ✅ | Descriptive pattern used |

---

## Remediation Priority Order

| Priority | Count | Items |
|---|---|---|
| P1 | 4 | P1-001 through P1-004 |
| P2 | 9 | P2-001 through P2-009 |
| P3 | 6 | P3-001 through P3-006 |

**Estimated remediation effort:**
- P1 items: ~4–6 hours (CSS global fix + 3 admin form fixes)
- P2 items: ~8–12 hours (legal content + cookie consent + WIOA notice + CSS audit)
- P3 items: ~2–3 hours (alt text polish + nav labels)

---

## ADA Lawsuit Risk Assessment

**Highest-risk items for ADA Title III litigation (based on common lawsuit patterns):**

1. **P1-001** — Focus indicators invisible in High Contrast Mode — keyboard-only users directly impacted
2. **P1-002/003/004** — Unlabeled form fields — screen reader users cannot complete workflows
3. **P2-008** — Missing WIOA EO Notice — federal compliance requirement for any WIOA-funded program

**Overall ADA risk level: MEDIUM-HIGH**  
The site has solid foundational structure (skip links, ARIA, semantic HTML) but the admin/portal form labeling gaps and focus indicator issue in High Contrast Mode are real exposure points, especially given the workforce development mission serving people with disabilities.

---

*Audit completed: 2026-03-27 | Forge ⚙️*
