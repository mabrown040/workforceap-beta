# Live QA sweep — 2026-05-14

Scope: bounded gstack live-site sweep on `https://www.workforceap.org` covering public marketing, auth/intake, and protected-route redirect smoke.

## Summary
- **Critical:** locale-protected redirect bug is still live in production.
- **High:** `/apply` still does not expose a real HTML form on production, despite visible controls.
- **Smoke pass:** unauthenticated protected-route access for `/en/partner` and `/en/dashboard/profile` now lands on login instead of crashing.
- **No browser console errors** were surfaced on the checked pages during this sweep.

## Findings

### 1) Critical — Spanish protected route redirects to English login
- Route tested: `/es/dashboard`
- Observed landing URL: `/en/login?redirectTo=%2Fes%2Fdashboard`
- Expected: `/es/login?redirectTo=%2Fes%2Fdashboard`
- Impact: locale continuity breaks for Spanish users before auth; confirms the locale-aware auth redirect fix is not live on production yet.
- Evidence: gstack browse live redirect trace during this sweep.

### 2) High — Apply page still lacks detectable native form semantics on production
- Route tested: `/en/apply`
- Observed: visible step-1 controls and CTA, but `gstack browse forms` returned `[]`.
- Impact: browser form tooling, accessibility tooling, and some automated QA paths still cannot detect a real form boundary on the live page.
- Notes: snapshot still shows textboxes/radios/buttons, so this is not a blank-page issue; it is specifically a missing/undetectable form structure issue on prod.

### 3) Smoke pass — protected routes no longer show obvious unauthenticated render crashes
- Routes tested:
  - `/en/partner`
  - `/en/dashboard/profile`
- Observed: both redirect to login with preserved `redirectTo` params.
- Impact: the earlier crash-class regressions are not visible on the current unauthenticated live path.
- Limitation: this does not verify authenticated rendering inside the portal.

## Route evidence
- `/es/dashboard` → `/en/login?redirectTo=%2Fes%2Fdashboard` (**wrong locale**)
- `/en/partner` → `/en/login?redirectTo=%2Fen%2Fpartner`
- `/en/dashboard/profile` → `/en/login?redirectTo=%2Fen%2Fdashboard%2Fprofile`
- `/en/apply` loads and renders, but no form is detected by gstack form inspection.

## Recommended next actions
1. Deploy the local locale-aware auth redirect fix first.
2. Deploy the local `/apply` semantic form fix next if not already included in the same release.
3. Re-run the same bounded live sweep after deploy:
   - `/es/dashboard`
   - `/en/apply`
   - `/en/partner`
   - `/en/dashboard/profile`
4. If Mike wants a true full-site pass after that, do it in three lanes:
   - public marketing/navigation
   - auth/intake/forms
   - authenticated portal role-by-role with session cookies

## Notes
- This was a bounded production sweep, not a claim that every route on the full site was exhaustively checked.
- gstack browse was run serially because concurrent browse sessions were unstable in this runtime.
