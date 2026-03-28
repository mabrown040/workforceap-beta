## Dark Mode QA Fix — 2026-03-25

### ISSUE-DM-001 — Apply page callout text invisible in dark mode

The "Where we operate today" callout box on /apply had a CSS specificity conflict:
- The wildcard rule `.apply-location-callout * { color: var(--color-gray-800) }` was overriding
  the dark mode rule `html.dark .apply-location-callout { color: var(--color-gray-300) }` on all descendants
- Root cause: wildcard selector has higher specificity than the dark mode parent selector

Fix:
- Scoped light mode wildcard rule to `html:not(.dark)` to avoid dark mode conflict
- Added explicit dark mode wildcard `html.dark .apply-location-callout *` with gray-300

Dark mode surfaces tested and passing:
- Homepage: solid
- Programs page: solid
- Admin pipeline: solid (em-dash fix confirmed working)
- Member portal (dashboard, learning, messages): solid
- Employer portal (jobs, pipeline): solid
- Apply page: fixed by this PR
