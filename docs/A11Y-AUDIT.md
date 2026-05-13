# Accessibility Audit — WorkforceAP

**Date:** 2026-05-13  
**Scope:** Public marketing pages, apply flow, portal pages, admin pages  
**Auditor:** DenchClaw (automated + manual review)  

---

## Summary

| Category | Issues Found | Quick Fixes | Remaining |
|----------|-------------|-------------|-----------|
| Form labels | 0 critical | — | 0 |
| Focus management | 1 | 1 | 0 |
| Color contrast | 0 critical | — | Needs design review |
| ARIA landmarks | Good | — | 0 |
| Heading hierarchy | 2 pages | 2 | 0 |
| Alt text | 1 | 1 | 0 |
| Error messages | Good | — | 0 |
| Modal dialogs | Partial | — | 2 need focus trap audit |
| Tables | 8+ tables | Fixed in DataTable + 4 files | 0 |
| Skip links | Present | — | 0 |

---

## Quick Fixes Applied

### 1. Clickable sort headers without keyboard access
**File:** `components/admin/TrainingProgressClient.tsx`  
**Issue:** `<span onClick={...}>` used for column sorting with no `role`, `tabIndex`, or keyboard handler.  
**Fix:** Added `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), and `aria-label`.

```tsx
<span
  role="button"
  tabIndex={0}
  onClick={() => handleSort(key)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(key); } }}
  aria-label={`Sort by ${label}`}
>
```

### 2. Missing table header scope
**Files:**
- `components/portal/ui/DataTable.tsx` — added `scope="col"` to all `<th>` elements in thead (fixes ALL tables using DataTable)
- `app/admin/placement-surveys/page.tsx` — added `scope="col"` to manual table headers
- `components/admin/IgnoredXapiSummaryCard.tsx` — added `scope="col"`
- `app/admin/reports/quarterly-outcomes/QuarterlyOutcomesClient.tsx` — added `scope="col"` to both tables
- `components/admin/B4BProgramsListButton.tsx` — added `scope="col"`

### 3. Heading hierarchy skips
**File:** `app/apply/page.tsx`  
**Issue:** `h1` → `h3` → `h4` skips.  
**Fix:** Changed `h3` → `h2`, `h4` → `h3`.

### 4. Meaningless alt text
**File:** `components/marketing/TestimonialsCarousel.tsx`  
**Issue:** `alt=""` on testimonial author photos.  
**Fix:** `alt={t.member.fullName ? \`${t.member.fullName} photo\` : 'Member photo'}`.

### 5. Missing h1 on accessibility page
**File:** `app/accessibility/page.tsx`  
**Fix:** Added `<h1 className="wa-sr-only">{t('heading')}</h1>`.

---

## Pre-existing Good Practices Found

- **Skip links:** Present in root `app/layout.tsx` (`Skip to main content`)
- **ARIA landmarks:** `<main id="main-content">` in root layout; portal/admin layouts rely on it correctly
- **aria-live regions:** 246 occurrences for dynamic content updates
- **Form error associations:** `aria-describedby` + `aria-invalid` used extensively (51+ inputs)
- **Login/Signup forms:** Excellent a11y — labels with `htmlFor`, `aria-invalid`, `aria-describedby`, `role="alert"`, password toggle with `aria-label` + `aria-pressed`
- **Focus rings:** Most `outline-none` usages paired with `focus-visible` alternatives

---

## Larger Issues Requiring Design/Architecture Changes

### 1. Modal Dialog Focus Management
**Risk:** Medium-High  
**Effort:** 1-2 days  
**Details:** Several modal components need audit for:
- Focus trap (Tab cycles within modal)
- Escape key to close
- `aria-modal="true"` on dialog container
- Return focus to trigger on close

**Files to audit:**
- `components/admin/PartnerDeactivateDialog.tsx`
- `components/admin/PartnerEditModal.tsx`
- `components/admin/SubgroupMembersTable.tsx` (deactivate modal)
- `components/portal/PortalHeaderActions.tsx` (mobile menu overlay)
- Any other Radix/Headless UI dialogs

### 2. Color Contrast Review
**Risk:** Medium  
**Effort:** 0.5-1 day  
**Details:** No critical contrast failures detected via spot checks, but a systematic review is recommended for:
- `--color-on-surface-variant` on light backgrounds
- Accent colors on small text
- Success/warning/error state colors
- Charts and data visualizations

**Tool:** Use axe DevTools or Lighthouse CI for automated contrast checks.

### 3. Mobile Bottom Navigation Touch Targets
**Risk:** Low-Medium  
**Effort:** 0.5 day  
**Details:** Verify all bottom-nav items meet 44×44dp minimum touch target (WCAG 2.5.5).

### 4. Table Captions
**Risk:** Low  
**Effort:** 0.5 day  
**Details:** Complex admin tables would benefit from `<caption>` elements for screen-reader context. DataTable component could accept an optional `caption` prop.

### 5. Apply Flow Step Indicator
**Risk:** Low  
**Effort:** 0.5 day  
**Details:** The step indicator (1 → 2 → 3) on `/apply/page.tsx` uses styled `<div>` elements. Should use `role="progressbar"` or `aria-current="step"` for screen readers.

---

## Files Modified

```
components/admin/TrainingProgressClient.tsx
components/marketing/TestimonialsCarousel.tsx
app/apply/page.tsx
app/accessibility/page.tsx
app/admin/placement-surveys/page.tsx
components/admin/IgnoredXapiSummaryCard.tsx
app/admin/reports/quarterly-outcomes/QuarterlyOutcomesClient.tsx
components/admin/B4BProgramsListButton.tsx
components/portal/ui/DataTable.tsx
```

---

## TypeScript Verification

`tsc --noEmit` run on 2026-05-13. No TypeScript errors introduced by the above changes. Pre-existing errors exist in test files and unrelated API routes.

---

## Next Steps

1. [ ] Assign modal focus-trap audit to a frontend-focused session
2. [ ] Run Lighthouse a11y audit on all critical user paths
3. [ ] Add automated a11y checks to CI (axe-core + Playwright)
4. [ ] Schedule quarterly a11y regression reviews
