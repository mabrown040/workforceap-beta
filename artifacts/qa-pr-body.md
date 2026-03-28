## QA Fixes — 2026-03-25

### ISSUE-001 — Apply page callout text invisible
Light mode: text inherited hero white color on white box. Dark mode: gray-700 on dark bg = near invisible.
Fix: explicit color enforcement on callout and descendants; dark mode updated to gray-300/gray-100.

### ISSUE-002 — Admin pipeline garbled em-dash
Avg Salary and Placement Rate showing garbled UTF-8 (double-encoded em-dash).
Fix: replaced broken literals with proper — character in pipeline/page.tsx (3 instances).

Health score: 83 to 93/100
