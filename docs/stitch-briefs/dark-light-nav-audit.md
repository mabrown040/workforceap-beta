# Stitch Brief: Dark/Light Mode + Nav Bar Audit

## What To Audit and Fix

### 1. Dark/Light Mode — Portal Pages
Walk every portal page and check:
- Text is readable in both dark and light mode
- No hardcoded hex colors that ignore `var(--color-*)` tokens
- Cards and containers use CSS custom properties not fixed backgrounds
- Icons and borders are visible in both modes

Key files to audit:
- `components/portal/tools/*.tsx` — all AI tools
- `components/portal/AIHistoryList.tsx`
- `app/(portal)/dashboard/page.tsx`
- `app/(portal)/dashboard/guide/page.tsx` (newly created)
- `app/(portal)/employer/page.tsx`
- `app/(portal)/counselor/page.tsx`

Fix pattern: replace hardcoded colors like `#121416`, `#1a1a1a`, `#fff`, `#000` with CSS vars:
- Background: `var(--color-surface)` or `var(--surface-container-low)`
- Text: `var(--color-on-surface)` 
- Muted text: `var(--color-on-surface-variant)`
- Border: `var(--surface-container-high)` or `var(--outline-variant)`
- Accent: `var(--color-accent)`

### 2. Mobile Nav Bar — Member Portal
File: `components/MobileBottomNav.tsx`

Check and fix:
- Active tab is visually distinct (correct highlight on current route)
- Icons and labels are properly visible in dark + light mode
- Touch targets are at least 44px
- Safe area inset at bottom (`padding-bottom: env(safe-area-inset-bottom)`)
- Interview Coach and Career Counselor are NOT in the mobile nav (they're tools, not nav destinations — correct)
- "Guide" page should be discoverable from nav (either a tab or accessible from Dashboard tab)

### 3. Desktop Nav — All Portals
Check each portal shell for nav visibility:
- `components/portal/DashboardShell.tsx` — member portal
- `components/portal/EmployerPortalShell.tsx` (if exists)
- `components/portal/CounselorPortalShell.tsx`

Verify:
- Nav links are visible and active state is clear
- Dark/light toggle (if exists) works correctly
- Portal guide links are present in each nav

### 4. Quick wins to check
- `MobileBottomNav` variant="portal" includes all key member destinations
- Each portal nav has a "Help" or "Guide" link
- No `color: white` hardcoded on elements that break in light mode

## Approach
1. Do a visual audit using the existing pages/components
2. Fix the most common pattern first (hardcoded colors → CSS vars)
3. Check MobileBottomNav active state logic
4. Verify portal nav shells

## Files Likely Needing Fixes
- `components/MobileBottomNav.tsx`
- `components/portal/DashboardShell.tsx` 
- `components/portal/tools/*.tsx` (any with hardcoded colors)
- `app/(portal)/dashboard/page.tsx`
- CSS portal file: `css/portal.css`

Branch: `fix/dark-light-nav-audit`
PR against master.
