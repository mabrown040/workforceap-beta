# Sprint 10: Dark Mode + Light Mode UI/UX Bug Fixes

Comprehensive visual audit fixes for both light and dark mode. All issues are from code review + pre-demo audit.

---

## Category 1: Hardcoded Colors Breaking Dark Mode

### Fix 1A: Programs page — hardcoded `color: '#666'` and `'#888'` in ProgramsContent.tsx

**File:** `app/programs/ProgramsContent.tsx`

**Problem:** Two inline style hardcodes are invisible in dark mode:
```tsx
// BAD — #666 and #888 disappear on dark backgrounds
<div className="program-card-meta-row" style={{ color: '#666' }}>
<small style={{ color: '#888' }}>*Austin-area median based on industry data</small>
```

**Fix:** Replace with CSS variables:
```tsx
<div className="program-card-meta-row" style={{ color: 'var(--color-gray-500)' }}>
<small style={{ color: 'var(--color-gray-400)' }}>*Austin-area median based on industry data</small>
```

AND add dark mode override in `css/main.css`:
```css
html.dark .program-card-meta-row { color: var(--color-gray-400, #a3a3a3); }
html.dark .program-card { background: #1e1e1e; border-color: #333; }
html.dark .program-card-best-for { color: #c0c0c0; }
html.dark .program-card-outcomes { color: #a0a0a0; }
html.dark .program-card-footer { border-top-color: #333; background: #161616; }
html.dark .program-filters .filter-chip { background: #1e1e1e; border-color: #333; color: #e0e0e0; }
html.dark .program-filters .filter-chip.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
html.dark .programs-decision-cta { background: #1a1a1a; border-color: #333; color: #e0e0e0; }
html.dark .programs-decision-lead { color: #a0a0a0; }
```

### Fix 1B: Admin Blog AI page — hardcoded colors

**File:** `app/admin/blog/ai/BlogAIClient.tsx`

Replace all inline `color: '#666'`, `color: '#555'`, `color: '#888'` with `color: 'var(--color-gray-500)'` or use a CSS class. Also fix `color: '#c00'` → `color: 'var(--color-accent)'`.

### Fix 1C: Admin Blog Editor — hardcoded colors

**File:** `app/admin/blog/BlogPostEditor.tsx`

Same pattern — replace `#666`, `#999`, `#444`, `#333`, `#555` with CSS vars or semantic classes. The blue `#2563eb` should be `var(--color-blue)`.

### Fix 1D: Program Resources page

**File:** `app/(portal)/dashboard/resources/page.tsx`

`color: '#999'` → `color: 'var(--color-gray-400)'`

### Fix 1E: Resume client error messages

**File:** `app/(portal)/dashboard/resume/ResumeClient.tsx`

`color: '#c00'` → `color: 'var(--color-accent)'` (reuses crimson semantic color)

### Fix 1F: Admin member/partner new forms

**Files:** 
- `app/admin/members/new/AddMemberWizard.tsx`
- `app/admin/partners/new/NewPartnerForm.tsx`

Error banners: `background: '#fee', color: '#c00'` → use a semantic error class or CSS vars:
```tsx
style={{ background: 'var(--color-error-bg, #fee)', color: 'var(--color-accent)' }}
```

Add to `css/main.css`:
```css
html.dark .error-banner { background: #2d1515; color: #ff8080; }
```

---

## Category 2: Missing Dark Mode Coverage for Key Sections

### Fix 2A: Programs page cards (`.program-card`)

Already covered in Fix 1A above. The `.program-card` class has NO dark mode override — cards render with white background in dark mode.

### Fix 2B: Salary Guide page

**Check:** Does `css/main.css` have `html.dark` overrides for `.salary-guide-*` classes?

If not, add:
```css
html.dark .salary-guide-table { background: #1e1e1e; border-color: #333; }
html.dark .salary-guide-table th { background: #262626; color: #f0f0f0; }
html.dark .salary-guide-table td { color: #c0c0c0; border-color: #333; }
html.dark .salary-guide-header { background: #1a1a1a; color: #f0f0f0; }
```

### Fix 2C: Program Comparison page

Add dark overrides for comparison table:
```css
html.dark .program-comparison-table { background: #1e1e1e; }
html.dark .program-comparison-table th { background: #262626; color: #f0f0f0; }
html.dark .program-comparison-table td { color: #c0c0c0; border-color: #333; }
html.dark .comparison-header { color: #f0f0f0; }
```

### Fix 2D: Blog page + Blog post cards

Add:
```css
html.dark .blog-card { background: #1e1e1e; border-color: #333; }
html.dark .blog-card h2, html.dark .blog-card h3 { color: #f0f0f0; }
html.dark .blog-card p { color: #a0a0a0; }
html.dark .blog-card-meta { color: #888; }
html.dark .blog-post-content { color: #c0c0c0; }
html.dark .blog-post-content h2, html.dark .blog-post-content h3 { color: #f0f0f0; }
```

### Fix 2E: Contact page

Add:
```css
html.dark .contact-form { background: #1e1e1e; border-color: #333; }
html.dark .contact-form label { color: #f0f0f0; }
html.dark .contact-form input, html.dark .contact-form textarea { background: #262626; border-color: #444; color: #f0f0f0; }
html.dark .contact-info-section { color: #c0c0c0; }
```

### Fix 2F: Privacy + Terms pages

Add:
```css
html.dark .legal-page { color: #c0c0c0; }
html.dark .legal-page h2, html.dark .legal-page h3 { color: #f0f0f0; }
html.dark .legal-page a { color: var(--color-accent); }
```

---

## Category 3: CSS Variable Dark Mode Remapping

The `:root` block defines vars like `--color-primary: #1a1a1a` (near-black) but they are NEVER remapped in `html.dark`. This means in dark mode, near-black text (`--color-primary`) still renders near-black on a dark background.

**Fix:** Add a full variable remap block in `css/main.css` right after `:root {}`:

```css
html.dark {
  --color-primary: #f0f0f0;          /* was near-black, now near-white */
  --color-white: #111111;            /* was white, now near-black (page bg) */
  --color-light: #1a1a1a;           /* was light gray bg, now dark bg */
  --color-gray-50: #1e1e1e;
  --color-gray-100: #242424;
  --color-gray-200: #2e2e2e;
  --color-gray-300: #404040;
  --color-gray-400: #a3a3a3;        /* mid-gray stays readable */
  --color-gray-500: #737373;
  --color-gray-600: #a3a3a3;        /* was dark, now lighter for readability */
  --color-gray-700: #c0c0c0;
  --color-gray-800: #e0e0e0;
  --color-border: #333333;
  /* accent, gold, blue, green stay the same in dark mode */
}
```

This is the root fix that cascades to all elements using CSS variables.

---

## Category 4: UX Issues (Both Modes)

### Fix 4A: Apply page — "Where we operate today" box

**Verify** the fix from Sprint 9 landed. Check `css/main.css` for:
```css
html.dark .apply-location-callout { ... }
```
If it exists and has light-colored text + dark background → confirmed fixed.
If missing → add it.

### Fix 4B: Apply page — step indicators pre-checked

**Verify** from Sprint 9. The step progress bar for steps 2+3 should show as INACTIVE (gray/outlined) before the user reaches them. Look in `components/ApplyFormStatusBar.tsx` for the completion logic.

### Fix 4C: Programs page plural string ("View 6 course s")

**Verify** from Sprint 9. Search `app/programs/ProgramsContent.tsx` for the plural render logic. Ensure it's `${count} ${count === 1 ? 'course' : 'courses'}` with no line breaks.

### Fix 4D: Find Your Path — add question counter ("1 of 5")

**File:** `app/find-your-path/FindYourPathClient.tsx`

The quiz shows a progress bar but no text counter. Add:
```tsx
<p className="quiz-progress-label">{currentStep + 1} of {totalSteps}</p>
```
Near the top of the quiz, below the progress bar. Style: `font-size: 0.875rem; color: var(--color-gray-500)`.

### Fix 4E: Admin Job filter tabs — very low contrast

**File:** `components/admin/AdminJobsFilterTabs.tsx`

The inactive tab text is near-invisible. Ensure active tab has `color: var(--color-accent)` or high-contrast styling. Add dark mode:
```css
html.dark .admin-filter-tabs .tab { color: #a0a0a0; border-color: #333; }
html.dark .admin-filter-tabs .tab.active { color: var(--color-accent); border-color: var(--color-accent); }
```

---

## File Checklist
- [ ] `app/programs/ProgramsContent.tsx` — replace hardcoded colors
- [ ] `app/admin/blog/ai/BlogAIClient.tsx` — replace hardcoded colors
- [ ] `app/admin/blog/BlogPostEditor.tsx` — replace hardcoded colors
- [ ] `app/(portal)/dashboard/resources/page.tsx` — replace #999
- [ ] `app/(portal)/dashboard/resume/ResumeClient.tsx` — replace #c00
- [ ] `app/admin/members/new/AddMemberWizard.tsx` — error banner colors
- [ ] `app/admin/partners/new/NewPartnerForm.tsx` — error banner colors
- [ ] `css/main.css` — add `html.dark { }` CSS variable remap block
- [ ] `css/main.css` — add dark overrides for: program-card, salary-guide, program-comparison, blog-card, contact-form, legal-page
- [ ] Verify: `apply-location-callout` dark mode (Sprint 9)
- [ ] Verify: apply step indicators (Sprint 9)
- [ ] Verify: plural string fix (Sprint 9)
- [ ] `app/find-your-path/FindYourPathClient.tsx` — add "X of Y" quiz counter
- [ ] `components/admin/AdminJobsFilterTabs.tsx` — contrast fix

## Quality Bar
- `npx tsc --noEmit` must pass
- Test toggle: switch dark ↔ light on each page — no flash of invisible text
- No new external dependencies
- CSS changes only in `css/main.css` (no new files)

---

## Category 5: UX � Public Pages

### Fix 5A: /jobs page � add explanation for unauthenticated visitors

**Problem:** Public users clicking "Jobs" in the nav are silently redirected to the login page with no explanation. This kills trust.

**Fix:** In pp/jobs/page.tsx (or middleware), detect unauthenticated state and show a landing page instead of a redirect:

`	sx
// If no session, show a public landing page:
<div className="inner-page">
  <PageHero
    title="Job Board"
    subtitle="WorkforceAP job listings are available to enrolled members."
  />
  <section className="content-section">
    <div className="container" style={{ maxWidth: '600px', textAlign: 'center' }}>
      <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--color-gray-600)' }}>
        Our job board features curated roles from Austin employer partners � matched to your program and skills.
        Enroll to access job listings, apply to openings, and get AI-powered career matching.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/apply" className="btn btn-primary">Apply to Enroll</Link>
        <Link href="/programs" className="btn btn-outline">Browse Programs</Link>
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
        Already enrolled? <Link href="/login?redirectTo=/jobs" style={{ color: 'var(--color-accent)' }}>Sign in</Link>
      </p>
    </div>
  </section>
</div>
`

Check pp/jobs/page.tsx � if it already calls getUser() and redirects on null, replace the redirect with the landing page content above.

### Fix 5B: Viewport meta tag � verify it exists

**Check:** In pp/layout.tsx, confirm Next.js is outputting the viewport meta tag. Next.js 13+ adds it automatically if metadata.viewport is set.

In pp/layout.tsx, ensure the metadata export includes:
`	s
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};
`
Or confirm it's already being output by checking the rendered HTML.
