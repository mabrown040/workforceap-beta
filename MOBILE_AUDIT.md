# Mobile UX Audit — Member Portal

**Date:** 2026-05-13
**Scope:** Portal navigation, auth/login/signup forms, apply flow, profile forms, pre-screening, content readability, performance skeletons

## Findings

### ✅ Already Good
- **Viewport meta:** `viewportFit: 'cover'` with safe-area support
- **Mobile nav:** Member portal uses sticky top horizontal scroll nav (MemberPortalTopNav) with 44px touch targets, edge-fade, and scroll-snap
- **Bottom nav:** Has `env(safe-area-inset-bottom)` padding; member variant correctly returns `null` (top-nav replaces it)
- **Global input sizing:** `main.css` `@media (hover: none)` forces `input, select, textarea { min-height: 44px; font-size: 16px; }`
- **Portal form controls:** `portal.css` `.portal-form-control` uses `font-size: 1rem` on mobile (prevents iOS zoom)
- **Skeleton loaders:** `PortalRouteLoading` used in `app/(portal)/loading.tsx` with proper pulse animation
- **Table stacking:** Application tracker, salary table, program comparison all have mobile stacked-card CSS
- **Tap targets:** `.btn`, `.portal-section-action`, `.mobile-bottom-nav a` all have `min-height: 44px` in portal.css
- **Auth forms:** Login form has `autoComplete="email"`, `autoComplete="current-password"`, and 44px password toggle
- **Apply flow:** `ApplyEligibilityClient` already has `inputMode="email"`, `inputMode="tel"`, `autoComplete` attributes

### 🔧 Issues Found & Fixes Applied

#### 1. Password toggle buttons too small (touch target < 44px)
**Files:**
- `app/(auth)/signup/SignupForm.tsx` — password toggle uses `padding: var(--space-1)` (~4px) with no min-size
- `app/apply/create-account/ApplyCreateAccountForm.tsx` — both password toggles use `padding: 0.25rem` with no min-size

**Fix:** Added `minWidth: 44, minHeight: 44` to toggle button styles.

#### 2. Missing `inputMode` attributes
**Files:**
- `app/(auth)/signup/SignupForm.tsx` — phone input missing `inputMode="tel"`
- `app/apply/create-account/ApplyCreateAccountForm.tsx` — phone missing `inputMode="tel"`, zip missing `inputMode="numeric"`
- `components/portal/ProfileForm.tsx` — phone missing `inputMode="tel"`, zip missing `inputMode="numeric"`
- `components/portal/DashboardProfileForm.tsx` — phone missing `inputMode="tel"`
- `components/portal/MemberPreScreeningForm.tsx` — phone missing `inputMode="tel"`

**Fix:** Added appropriate `inputMode` attributes to all phone and ZIP inputs.

#### 3. Missing `autoComplete` attributes
**Files:**
- `components/portal/ProfileForm.tsx` — fullName, phone, address, city, state, zip missing autocomplete
- `components/portal/DashboardProfileForm.tsx` — firstName, lastName, phone, address missing autocomplete
- `components/portal/MemberPreScreeningForm.tsx` — phone, address missing autocomplete

**Fix:** Added `autoComplete` values: `name`, `given-name`, `family-name`, `tel`, `street-address`, `address-level2`, `address-level1`, `postal-code`.

#### 4. Cramped 3-column grid on mobile
**File:** `components/portal/DashboardProfileForm.tsx`
- City/State/ZIP row uses `gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'` with no responsive breakpoint
- On small screens (< 400px) each column is ~100px wide, making inputs unusable

**Fix:** Changed grid to use responsive CSS class instead of inline style: `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` which collapses to 1 column on very small screens and 2-3 columns as space allows.

## Commits
- `fix: mobile touch targets on password toggles`
- `fix: add inputMode and autoComplete to portal forms`
- `fix: responsive city/state/zip grid in profile form`
