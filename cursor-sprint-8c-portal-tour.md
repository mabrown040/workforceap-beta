# Sprint 8c: Portal Tooltip Tour + Dev Reset (implemented)

## Shipped

- **Schema:** `tourCompletedAt` on `User`, `Employer`, `Partner` — migration `20260404120000_onboarding_tour_completed`.
- **APIs:**
  - `POST /api/onboarding/tour-complete` — sets `tourCompletedAt` (same auth pattern as onboarding complete).
  - `POST /api/onboarding/reset` — clears `onboardingCompletedAt`, `onboardingPortal`, `tourCompletedAt` (member); clears onboarding + tour on employer/partner. **Production:** super_admin only. **Non-production:** any authenticated user (for local QA).
- **`PortalTour.tsx`:** Overlay, crimson highlight ring (`wa-ring-brand-accent`), popover with `wa-bg-brand-primary` header, skip missing targets, ESC / backdrop / Done calls tour-complete.
- **`PortalEntryClient`:** Wraps dashboard + tour + `OnboardingDevReset` (super_admin only).
- **`data-tour`:** On `WorkspaceShell` nav links via `portalNav.tourTarget`; employer overview `data-tour="tour-post-job"`; partner referral block `data-tour="tour-referral-link"`.
- **Member nav:** Added job board item (`/jobs`) with `tour-jobs` for the tour spec.

## Theme (with this work)

- `ThemeInitScript` + `ThemeToggle` (marketing nav + portal header).
- `html.dark` overrides in `main.css` for readable text on marketing home sections and portals.
- `tailwind.config.ts`: `darkMode: 'class'`.

## Brand tokens (tour + wizard)

- Primary CTA / active dots: **crimson** (`wa-brand-accent`), not blue. Popover title bar: **near-black** (`wa-bg-brand-primary`).
