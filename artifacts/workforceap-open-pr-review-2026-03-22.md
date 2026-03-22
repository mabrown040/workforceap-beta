# WorkforceAP Open PR Review — 2026-03-22

Repo: `mabrown040/workforceap-beta`

## Open PRs Found

### PR #112 — Launch Prep: Salary Guide Mobile Defect Fix + Last-Mile Polish
- URL: https://github.com/mabrown040/workforceap-beta/pull/112
- State: Open (not draft)
- Base: `master`
- Head: `cursor/portal-system-finalization-8faa`
- Commits: 1
- Diff size: +236 / -82 across 8 files
- Mergeability: `dirty` (requires conflict resolution before merge)

## Files Changed (PR #112)
- `app/(portal)/employer/jobs/[id]/page.tsx`
- `app/(portal)/employer/jobs/page.tsx`
- `components/ConditionalMarketingNav.tsx`
- `components/employer/DraftJobCards.tsx`
- `components/portal/EmployerPortalShell.tsx`
- `components/portal/PortalShell.tsx`
- `components/super-admin-view-switcher.tsx`
- `css/main.css`

## Review Notes (quick risk lens)

### Positive
- Consolidates employer shell/navigation into cleaner single-header UX.
- Adds explicit portal route suppression for marketing nav (`PORTAL_PREFIXES`) to avoid dual-nav behavior.
- Mobile-focused CSS additions for employer portal pages appear intentional and scoped.

### Risks to verify before merge
1. **Merge conflict risk (blocking):** PR is currently marked dirty.
2. **Route visibility risk:** expanded portal prefix suppression could hide marketing nav on routes that still expect it; verify all portal/public boundaries.
3. **Responsive regressions:** large CSS insertion in `main.css` needs mobile/desktop smoke pass for employer pages.
4. **Super-admin switching UX:** shortened labels and banner wording changed; verify admin context remains clear in all view modes.

## Required before merge
1. Rebase/merge `master` into PR branch and resolve conflicts.
2. Run targeted smoke tests:
   - `/employer`
   - `/employer/jobs`
   - `/employer/jobs/new`
   - `/employer/jobs/import`
   - `/employer/jobs/[id]`
   - confirm public marketing routes still render `MainNav`.
3. Confirm no portal shells double-render nav on partner/my-group/member routes.
4. Capture before/after screenshots for mobile width and desktop width.

## Disposition
- **Status:** HOLD (pending conflict resolution + verification)
- **Recommendation:** Resolve conflicts, run smoke matrix, then merge if clean.
