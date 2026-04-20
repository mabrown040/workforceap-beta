# WorkforceAP Site UI and Function Audit

## Executive Summary
This document summarizes a full site UI audit of the WorkforceAP application, focusing on accessibility, usability, and standard React/HTML best practices for interactive elements.

## Findings

1. **Missing Button Types:** Numerous `<button>` elements across the portal and decision-journey routes lack an explicit `type` attribute. Defaulting to `type="submit"` inside forms can cause unintended page reloads or form submissions.
2. **Inaccessible Interactive Elements:** Several interactive components use `<div>`, `<span>`, or `<li>` tags with `onClick` handlers but lack necessary accessibility attributes (`role="button"`, `tabIndex={0}`, and `onKeyDown` listeners). Note: We cannot automatically fix these without deeper context, as some are modals/overlays (role="dialog") and some are meant to be buttons.
3. **Form Accessibility:** Some forms may be missing explicit linking between input fields and their labels using `id` and `htmlFor`, or `aria-describedby` for helper text.
4. **General Polish:** Minor inconsistencies in button styling, hover states, and loading states across the portal.

## Actions Taken
1. **Button Type Fixes:** Automated and manual passes were made to inject `type="button"` into `<button>` elements that were missing it, except for explicit submit buttons.

## Gameplan for Ongoing Improvements

1. **Linting & Tooling:** Introduce an accessibility linter (like `eslint-plugin-jsx-a11y`) to automatically catch missing roles, tab indexes, and button types during development.
2. **Component Abstraction:** Standardize interactive elements by relying on the central `Button` or a generic `Clickable` component rather than adding `onClick` to native `<div>` elements.
3. **Keyboard Navigation Audit:** Manually test all interactive dropdowns, modals, and lists using only the keyboard to ensure proper focus trapping and element activation.
4. **Design System Alignment:** Continue aligning all UI components with the designated Stitch MCP designs, ensuring the design system's spacing and typography are rigorously followed.
