# Portal UI Pattern Audit — Post-PR #1035

This audit catalogs repeated inline patterns across `app/(portal)/**` and `components/portal/**` that look like candidates for shared primitives (DataTable, SectionHeader, etc.), similar to what PR #1035 addressed.

## Summary

| Category | Count | Strong Candidates | Medium | Weak |
|----------|-------|-------------------|--------|------|
| Inline `<h2/h3/h4>` with `style={{...}}` | ~225 | — | many | — |
| `portal-section-header` / `portal-dash-section-header` blocks | ~18 | 5 | 8 | 5 |
| Inline `<table>` markup | 3 | 2 | 1 | — |
| Repeated heading + subheading + action patterns | ~12 | 4 | 5 | 3 |

---

## 1. Section-Header Blocks (repeated inline markup)

Pattern: a `<div>` wrapper around a heading (`<h2>`/`<h3>`) often with an action link/button, using classes like `portal-section-header`, `portal-dash-section-header`, `portal-heading-with-bar`, `portal-section-heading`.

### Strong migration candidates

| File | Line(s) | Pattern | Notes |
|------|---------|---------|-------|
| `app/(portal)/dashboard/page.tsx` | 855–858, 881–883 | `<div className="portal-dash-section-header"><h3>...</h3><Link>...</Link></div>` | Repeated 2× on same page; also in `components/portal/DashboardHomeClient.tsx:538–544` — exact same pattern. |
| `app/(portal)/employer/page.tsx` | 429–430, 511–512 | `<div className="portal-section-header"><h2 className="portal-heading-with-bar portal-section-heading">...</h2></div>` | Repeated 2× on same page. |
| `app/(portal)/partner/page.tsx` | 457–458 | `<div className="portal-section-header"><h2 className="portal-heading-with-bar portal-section-heading">...</h2></div>` | Same pattern as employer. |
| `components/portal/CourseraProgressCardView.tsx` | 93, 138 | `<h2 className="portal-section-heading" style={{ margin: 0, fontSize: '1rem' }}>...</h2>` | Repeated 2× inside same component; only diff is title text. |
| `app/(portal)/counselor/students/[memberId]/page.tsx` | 637 | `<h2 className="portal-section-heading" style={{ marginBottom: '0.75rem' }}>...</h2>` | Same pattern as dashboard/training, certifications, etc. |

### Medium candidates

| File | Line(s) | Pattern |
|------|---------|---------|
| `app/(portal)/dashboard/training/page.tsx` | 377, 402 | `<h2 className="portal-section-heading" style={{ margin: 0, fontSize: '1rem' }}>…</h2>` and `style={{ margin: 0 }}` |
| `app/(portal)/dashboard/certifications/page.tsx` | 541, 699 | `<h2 className="portal-section-heading" style={{ margin: 0 }}>…</h2>` — repeated 2× |
| `app/(portal)/dashboard/program/page.tsx` | 122, 164 | `<h2 className="portal-section-heading" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>` and `<h3 className="portal-section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>` |
| `app/(portal)/counselor/page.tsx` | 281, 345 | `<h3 className="portal-section-heading" style={{ margin: 0 }}>` and plain `<h3 className="portal-section-heading">` |
| `app/(portal)/dashboard/learning/page.tsx` | 465 | `<h2 className="portal-section-heading" style={{ margin: 0 }}>…</h2>` |
| `components/portal/sessions/SessionsIndexBody.tsx` | 172, 191 | `<h2 className="portal-section-heading" style={{ margin: 0 }}>…</h2>` — repeated 2× |
| `components/portal/counselor/CounselorCommandCenter.tsx` | 38 | `<h2 className="portal-section-heading" style={{ margin: '0.15rem 0 0' }}>…</h2>` |
| `app/(portal)/dashboard/guide/page.tsx` | 270, 298 | `<h2 className="portal-section-heading">` and `style={{ marginBottom: '1.25rem' }}` |

### Weak / one-off candidates

| File | Line(s) | Pattern |
|------|---------|---------|
| `components/portal/CourseraAccountLinkCard.tsx` | 56 | `<h2 className="portal-section-heading" style={{ margin: 0, fontSize: '1rem' }}>…</h2>` |
| `app/(portal)/dashboard/counselor/page.tsx` | 58 | `<h2 className="portal-section-heading" style={{ marginBottom: '1rem' }}>…</h2>` |
| `app/(portal)/dashboard/program/start/page.tsx` | 134 | `<h2 className="portal-section-heading" style={{ fontSize: '1rem', margin: '0 0 0.35rem' }}>…</h2>` |
| `app/(portal)/counselor/resources/page.tsx` | 58, 69, 81, 101, 112, 125 | `<h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>…</h2>` — repeated 6×, but these are simple section titles inside a card stack; might not need a full primitive. |
| `app/(portal)/partner/settings/page.tsx` | 75, 86 | `<h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>…</h2>` — 2×, same pattern as counselor/resources. |

---

## 2. Inline Heading Styles (no className, pure `style={{…}}`)

These are the most numerous (~225 occurrences). They represent raw `<h2>`, `<h3>`, `<h4>` elements with inline style objects. Many share identical or near-identical style signatures.

### High-frequency signatures

| Signature | Approx. Count | Example Files |
|-----------|---------------|---------------|
| `fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase'` | 4 | `DashboardHomeClient.tsx:307, 322, 509, 522` |
| `fontWeight: 700, fontSize: '1rem', margin: '0.45rem 0 0.35rem', color: 'var(--color-on-surface)'` | 3 | `DashboardHomeClient.tsx:556, 613, 631` |
| `fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem'` | 3 | `PortalVoiceSession.tsx:777, 781`; `LearningHubEnrolledCourses.tsx:103` |
| `fontSize: '1.05rem', fontWeight: 700, marginBottom: 0, color: 'var(--color-on-surface)'` | 2 | `MentorSessionForm.tsx:35`; `partner/resources/page.tsx:58` |
| `fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-on-surface)'` | 2 | `partner/resources/page.tsx:121` |
| `fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem'` | 2 | `PortalVoiceSession.tsx:1068`; `MemberCareerPathSection.tsx:30` (similar) |

> **Assessment:** These are strong candidates for a `<SectionHeader size="sm|md|lg" variant="uppercase|normal" />` primitive, but because they’re sprinkled across many files and often have one-off tweaks (e.g., `textAlign: 'center'`), migration would be medium-to-high effort. The 4 identical copies in `DashboardHomeClient.tsx` are the strongest immediate win.

---

## 3. Inline `<table>` Markup

| File | Line(s) | Pattern | Candidate Strength |
|------|---------|---------|---------------------|
| `components/portal/ApplicationTrackerTable.tsx` | 336–380 | Full `<table className="application-tracker-table"><thead>…<tbody>…` | **Strong** — already wrapped in its own component, but uses raw HTML table tags instead of a shared `DataTable`. |
| `app/(portal)/counselor/placements/page.tsx` | 209–260 | `<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}><thead>…<tbody>…` | **Strong** — identical style signature to `inactive-members/page.tsx`. |
| `app/(portal)/counselor/inactive-members/page.tsx` | 125–170 | Same inline styles as placements table. | **Strong** — near-duplicate of placements table. |

> **Assessment:** The two counselor tables (`placements` and `inactive-members`) share the exact same inline style object (`width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'`). They are strong candidates for a shared `DataTable` primitive. `ApplicationTrackerTable.tsx` is already its own component but could be refactored to use the same primitive.

---

## 4. Heading + Subheading + Action Pairings

These are blocks where a heading is immediately followed by a descriptive paragraph and/or an action link.

| File | Line(s) | Pattern | Strength |
|------|---------|---------|----------|
| `app/(portal)/dashboard/page.tsx` | 855–883 | `portal-dash-section-header` with `<h3>` + `<Link>` action | **Strong** |
| `components/portal/DashboardHomeClient.tsx` | 538–544 | `portal-dash-section-header` with `<h3>` + `<Link>` action | **Strong** |
| `app/(portal)/employer/page.tsx` | 429–430 | `portal-section-header` with `<h2>` + no action yet | **Medium** |
| `app/(portal)/employer/page.tsx` | 511–512 | Same as above | **Medium** |
| `app/(portal)/partner/page.tsx` | 457–458 | Same pattern | **Medium** |
| `components/portal/ProgramCommitmentPanel.tsx` | 39 | `portal-section-heading` + paragraph below | **Medium** |
| `components/portal/FindYourCareerSection.tsx` | 13, 47 | `<h5>` label + `<h2>` title pair | **Weak** — one-off pattern |

---

## 5. Existing Primitives (to check before creating new ones)

| Primitive | Found In | Reused? |
|-----------|----------|---------|
| `SectionHeader` | Not found in portal dirs | ❌ Does not exist yet |
| `DataTable` | Not found in portal dirs | ❌ Does not exist yet |
| `PortalEmptyState` | `components/portal/PortalEmptyState.tsx` | ✅ Used in a few places |
| `application-tracker-table` | `ApplicationTrackerTable.tsx` only | ✅ Single component, but raw HTML |

---

## Prioritized Recommendations

1. **Create `<SectionHeader>` component** — migrate the repeated `portal-dash-section-header` / `portal-heading-with-bar` / `portal-section-heading` blocks first (files: `dashboard/page.tsx`, `DashboardHomeClient.tsx`, `employer/page.tsx`, `partner/page.tsx`). These have the highest repetition and lowest variability.

2. **Create `<DataTable>` component** — migrate the two counselor inline tables (`counselor/placements/page.tsx`, `counselor/inactive-members/page.tsx`) and then refactor `ApplicationTrackerTable.tsx` to use it.

3. **Consolidate uppercase subheadings** — the 4 identical `<h3>` blocks in `DashboardHomeClient.tsx` (`Program Application`, `Application Status`, `Pre-screening`, `Interview`) are exact copies and easy to extract into a `<Subheading uppercase>` primitive.

4. **Tackle pure inline `style={{…}}` headings last** — ~225 occurrences with high variability. A systematic pass after the above three items would benefit from the established size/variant API.
