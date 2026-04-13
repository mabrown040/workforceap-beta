# Portal pre-PR audit (responsive + shell)

Use this checklist before merging portal UI work. **Authenticated routes** cannot be fully exercised in CI without real Supabase sessions; run the manual steps locally or on a preview deploy with test accounts.

## What was verified in code (this pass)

- **Workspace shell** (`WorkspaceShell.tsx`): `workspace-shell-body`, `workspace-shell-main-inner`, and sidebar use `min-width: 0` / flex patterns that avoid common grid overflow. Sticky header + tab bar heights are synced via CSS variables.
- **`data-portal-role` on `<html>`**: Set on the client when any portal shell mounts so `main.css` rules like member mobile header minimization (`html[data-portal-role="member"] …`) actually apply. Previously the attribute was never set.
- **Grids**: Counselor + employer **guide** FAQ grids use `minmax(min(320px, 100%), 1fr)` so columns do not force horizontal scroll on ~320px viewports.
- **Admin metrics grid** (`.portal-grid-metrics`): uses `minmax(min(200px, 100%), 1fr)` (see `css/portal.css`).

## Routes by surface (representative)

| Surface   | Sample routes to spot-check |
|-----------|-----------------------------|
| Member    | `/dashboard`, `/dashboard/ai-tools`, `/dashboard/program`, `/dashboard/messages` |
| Employer  | `/employer`, `/employer/jobs`, `/employer/pipeline`, `/employer/guide` |
| Partner   | `/partner`, `/partner/messages`, `/partner/guide` |
| Counselor | `/counselor`, `/counselor/students`, `/counselor/guide` |

## Manual QA (required before release)

For **each role** you care about, log in and verify:

1. **≤768px**: Hamburger opens sidebar; overlay closes on tap outside; no horizontal page scroll on the pages above.
2. **≥1024px**: Sidebar collapse toggle persists; main content stays within `max-width` frame.
3. **Member**: Bottom nav (`MobileBottomNav` `variant="portal"`) clears content — scroll to bottom on `/dashboard` and one AI tool page; safe-area padding feels OK on iOS if testing on device.
4. **Employer / partner / counselor** where `MobileBottomNav` is used: same bottom clearance check on a page that includes it.

## Auth / environment

- Middleware protects `/dashboard`, `/employer`, `/partner`, `/counselor`, etc. Unauthenticated users hit `/login?redirectTo=…`.
- Local preview: if port **3000** is taken, run `npx next dev -p 3001` (or any free port).

## Follow-ups (optional)

- Add Playwright smoke tests with stored auth state for 1–2 portal URLs per role.
- Audit any remaining inline grids with `minmax(Npx, 1fr)` where `N > 280` without `min(Npx, 100%)`.
