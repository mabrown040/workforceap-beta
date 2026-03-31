## 2025-03-30 - Password visibility toggle on Signup form
**Learning:** Implemented a show/hide password toggle on the signup form to improve usability. It's a common micro-UX improvement that reduces friction and mistyped passwords, especially since the form lacks a "confirm password" field.
**Action:** When adding custom interactive elements like a password toggle inside an input wrapper, remember to add adequate padding (e.g. `paddingRight: 'var(--space-8)'`) to the input field so typed text doesn't overlap with the absolute positioned toggle button. Always ensure buttons have explicit `type="button"` to avoid accidental form submissions. Use `aria-pressed` and dynamic `aria-label` for screen reader accessibility.

## 2025-03-31 - Accessible Custom Dialogs
**Learning:** When building custom modals (like the `DeleteAccountButton` confirmation modal), screen readers may not announce the popup correctly without specific ARIA attributes.
**Action:** Always add `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` or `aria-label` to the container `div` that acts as the modal. Inputs without explicit `<label>` elements must also have an `aria-label` describing their purpose so assistive technology users know what to type.
