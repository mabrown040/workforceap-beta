# Broken internal links audit — 2026-05-21

**Branch:** `fix/broken-internal-links`  
**Scope:** `<Link href=`, `<a href=`, and `router.push` with static internal paths (236 `app/**/page.tsx` routes, `next.config.ts` redirects, `public/` assets).

## Summary

Audited **202** unique static internal hrefs across TS/TSX. **One** href targeted a non-existent Next.js route. One legacy alias was updated to the canonical member URL.

## Fixed

| Before | After | Action |
|--------|-------|--------|
| `/docs/OUTCOMES-METHODOLOGY.md` | `/admin/outcomes/methodology` | Added `app/admin/outcomes/methodology/page.tsx` (renders `docs/OUTCOMES-METHODOLOGY.md`); updated link in `app/admin/outcomes/page.tsx` |
| `/resources` (career brief CTA) | `/dashboard/career-library` | Replaced in `lib/content/careerBriefPersonalization.ts` (redirect already existed; now uses canonical route) |

## Verified OK (no change)

- **~200** marketing, portal, admin, employer, and counselor links — all resolve to `page.tsx` routes or `next.config.ts` redirects (e.g. `/resources` → `/dashboard/career-library`, `/profile` → `/dashboard/profile`).
- **`/openapi.json`** — served from `public/openapi.json`.
- **Dynamic hrefs** (`/admin/members/${id}`, `router.push` with IDs, tab query strings) — pattern-matched to dynamic segments.
- **External URLs** (`mailto:`, `tel:`, `https://`, member resume/LinkedIn URLs) — excluded from route check.
