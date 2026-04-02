## 2025-03-30 - Password visibility toggle on Signup form
**Learning:** Implemented a show/hide password toggle on the signup form to improve usability. It's a common micro-UX improvement that reduces friction and mistyped passwords, especially since the form lacks a "confirm password" field.
**Action:** When adding custom interactive elements like a password toggle inside an input wrapper, remember to add adequate padding (e.g. `paddingRight: 'var(--space-8)'`) to the input field so typed text doesn't overlap with the absolute positioned toggle button. Always ensure buttons have explicit `type="button"` to avoid accidental form submissions. Use `aria-pressed` and dynamic `aria-label` for screen reader accessibility.

## 2025-04-01 - Accessible Expandable Breakdowns
**Learning:** Expanding/collapsing sections (like the Job Readiness Score breakdown) without appropriate ARIA labels leaves screen reader users blind to the state change and unaware of what content the toggle controls. It also lacks visual feedback without an icon.
**Action:** When creating toggle buttons for collapsible sections, always use `aria-expanded={isExpanded}` to announce state, add `aria-controls="section-id"` linked to the content container's `id`, and provide a visual chevron icon (e.g. `expand_more`) that rotates to clearly indicate the current state and expected action.
