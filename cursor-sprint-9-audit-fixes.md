# Sprint 9: Audit Bug Fixes

Targeted fixes from the pre-production audit. All are isolated, non-breaking changes.

---

## Fix 1: Tour â€” Add "Skip tour" button + fix lingering highlight artifact

**File:** `components/onboarding/PortalTour.tsx`

**Problem 1:** No visible "Skip" / "Skip all" button. Users must click Next 5â€“7 times to close.
**Fix:** Add a "Skip tour" text link next to the Back button in the footer. Clicking it calls `finishAll()`.

```tsx
// In the footer button row, left side â€” before Back button:
<button
  type="button"
  onClick={() => void finishAll()}
  className="wa-text-xs wa-text-slate-400 hover:wa-text-slate-600 dark:wa-text-slate-500 dark:hover:wa-text-slate-300 wa-underline"
>
  Skip tour
</button>
```

**Problem 2:** After `finishAll()` is called (dismiss/complete), the highlight ring `<div>` (the `hl` element) sometimes stays rendered because the parent component (`PortalEntryClient`) sets `showTour={false}` asynchronously â€” there's a brief render window where the tour's internal `total === 0` guard hasn't fired yet.

**Fix:** In `PortalTour.tsx`, add a `done` state flag. Set it to `true` at the start of `finishAll`. Return `null` immediately when `done === true`:

```tsx
const [done, setDone] = useState(false);

const finishAll = useCallback(async () => {
  setDone(true);  // immediately unmount highlight + popover
  // ... existing fetch + onComplete logic
}, [...]);

if (done || !step || total === 0) return null;
```

---

## Fix 2: Apply page â€” "Where we operate today" box invisible

**File:** `app/apply/page.tsx` (and the dark mode CSS in `css/main.css`)

**Problem:** The `.apply-location-callout` element uses `background: var(--color-white)` and `color: var(--color-gray-800)` â€” these are light mode variables. In dark mode (`html.dark`), `--color-white` may resolve to near-white or the CSS variable override doesn't apply to this element, causing invisible text.

**Fix:** Add an explicit dark mode override in `css/main.css`:

```css
html.dark .apply-location-callout {
  background: #1e1e1e;
  color: #f0f0f0;
  border-left-color: var(--color-accent);
}
html.dark .apply-location-callout strong {
  color: #ffffff;
}
```

Also check: does the apply page use the marketing CSS (non-portal)? If the page's outer container has `background: var(--color-primary)` (dark), but the callout has `background: var(--color-white)` without a border, it may appear invisible because it visually blends with a white surrounding background that isn't there. Add a subtle border if none exists:

```css
.apply-location-callout {
  /* existing styles... */
  border: 1px solid var(--color-gray-200);  /* add this line */
}
```

---

## Fix 3: Programs page â€” "View 6 course s" plural string rendering bug

**Search for:** Any template literal or JSX that produces "View X course s" or "X active program s" â€” the `s` is on a new line/span.

**Pattern to look for** (in program card components or `lib/content/programs.ts`):
```tsx
// BAD â€” newline in template literal causes the "s" to render on new line:
`View ${count} course
s`

// or JSX like:
<span>View {count} course</span><span>s</span>

// or whitespace in a pluralize helper:
`${count} course${count !== 1 ? 
's' : ''}`
```

**Fix:** Ensure plural suffix is inline with no whitespace breaks:
```tsx
`View ${count} ${count === 1 ? 'course' : 'courses'}`
`${count} active ${count === 1 ? 'program' : 'programs'}`
```

Search all program-related components: `app/programs/`, `components/` with "course" or "program" count renders.

---

## Fix 4: Apply form â€” step progress indicators show pre-filled checkmarks

**File:** `app/apply/ApplyFlowClient.tsx` or wherever the step indicator is rendered.

**Problem:** Steps 2 and 3 show filled checkmarks (âœ“) before the user has reached them.

**Fix:** The step indicator should show:
- Step 1 (current): filled/active state
- Steps 2, 3 (future): outlined/gray state, no checkmark

Look for the step indicator component and ensure `isCompleted` / `isActive` logic only marks a step complete if `currentStep > stepIndex`, not `currentStep >= stepIndex`.

---

## Fix 5: Partner portal â€” add "Copy link" button for referral URL

**File:** `app/(portal)/partner/page.tsx`

**Problem:** Referral URL is displayed as plain text â€” no copy button. Partners must manually select and copy.

**Fix:** Add a copy-to-clipboard button next to the referral URL. Use the `navigator.clipboard` API:

```tsx
'use client';
// Add a CopyReferralLink component or inline button:
const [copied, setCopied] = useState(false);

<div className="referral-link-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <code style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>{referralApplyUrl}</code>
  <button
    type="button"
    onClick={async () => {
      await navigator.clipboard.writeText(referralApplyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }}
    className="btn btn-sm btn-secondary"
    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
  >
    {copied ? 'âœ“ Copied' : 'Copy link'}
  </button>
</div>
```

Since this needs `useState`, extract into a `'use client'` component: `components/portal/CopyReferralLink.tsx`.

---

## Fix 6: Employer portal â€” post-wizard floating dot (same as partner)

Already covered by Fix 1 (`done` state flag). Verify it also clears in the employer portal after the fix.

---

## Fix 7: Employer Settings â€” no save confirmation

**File:** `app/(portal)/employer/settings/page.tsx` or the settings form component.

**Problem:** After saving company settings, there's no success toast or confirmation.

**Fix:** After a successful `fetch` to the settings API, show a toast. If a toast system exists (look for `toast()` or `useToast()` in the codebase), use it. Otherwise add a simple inline success message:

```tsx
const [saved, setSaved] = useState(false);
// After successful save:
setSaved(true);
setTimeout(() => setSaved(false), 3000);

// In JSX near the Save button:
{saved && <p className="form-success" role="status">Settings saved.</p>}
```

---

## Fix 8: "Viewing as Test. Switch company" banner â€” hide for non-impersonation

**Problem:** The impersonation/debug banner appears for all users. Real employers see it and wonder if they're in the wrong account.

**Find:** The component that renders "Viewing as Test. Switch company" and add a guard â€” only show when the user is actually being impersonated (there should be an `impersonating` or `superAdmin` flag).

```tsx
// Only show if actively impersonating:
{isSuperAdmin && isImpersonating && <ImpersonationBanner ... />}
// or add: only show in dev/staging:
{process.env.NODE_ENV !== 'production' && <ImpersonationBanner ... />}
```

---

## Fix 9: "Workforce AP Applicants" title typo (extra space)

**File:** `app/(portal)/employer/applications/page.tsx`

Find the page metadata title and fix the brand name:
```ts
// WRONG:
title: 'Workforce AP Applicants'
// RIGHT:
title: 'WorkforceAP Applicants'
```

---

## File Checklist
- [ ] `components/onboarding/PortalTour.tsx` â€” skip button + done state fix
- [ ] `css/main.css` â€” dark mode fix for `.apply-location-callout`
- [ ] `app/programs/` or program card components â€” plural string fix
- [ ] `app/apply/ApplyFlowClient.tsx` â€” step indicator pre-fill fix
- [ ] `components/portal/CopyReferralLink.tsx` â€” new component
- [ ] `app/(portal)/partner/page.tsx` â€” use CopyReferralLink
- [ ] Employer settings component â€” save confirmation toast
- [ ] Impersonation banner â€” guard for non-admin users
- [ ] `app/(portal)/employer/applications/page.tsx` â€” title typo

## Quality Bar
- `npx tsc --noEmit` must pass
- No new dependencies
- All fixes are surgical â€” do not refactor surrounding code

---

## Fix 10: Admin Programs Catalog — empty table (seed not called)

**Root cause:** lib/platform/seedProgramCatalog.ts has seedOrganizationProgramCatalog() which upserts all 19 programs into OrganizationProgramCatalog, but it was never called. The table is empty so the admin catalog shows zero rows.

**Fix A — One-time DB seed via API route** (preferred — works in production without deploy):

Create pp/api/admin/programs/seed-catalog/route.ts:
`	s
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { seedOrganizationProgramCatalog } from '@/lib/platform/seedProgramCatalog';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const orgId = await getDefaultOrganizationId();
  await seedOrganizationProgramCatalog(orgId);
  return NextResponse.json({ ok: true });
}
`

Then add a "Seed catalog from static programs" button on pp/admin/programs/page.tsx (visible only when ows.length === 0):
`	sx
{rows.length === 0 && (
  <button onClick={async () => {
    await fetch('/api/admin/programs/seed-catalog', { method: 'POST' });
    window.location.reload();
  }} className="btn btn-primary">
    Seed catalog from 19 static programs
  </button>
)}
`

**Fix B — Auto-seed on catalog GET** (fallback in the API route):
In pp/api/admin/programs/catalog/route.ts, after fetching rows, if ows.length === 0, call seedOrganizationProgramCatalog(organizationId) automatically and re-fetch.

Use Fix B — it's invisible and automatic. Admin just loads the page and programs appear.

---

## Fix 11: Admin pages missing <title> metadata (wrong title in browser tab)

**Problem:** These admin pages have no export const metadata — Next.js falls back to the root layout title ("? Virtual and Hybrid Occupation and Career Programs..."):
- pp/admin/blog/page.tsx
- pp/admin/invites/page.tsx
- pp/admin/partners/page.tsx
- pp/admin/pipeline/page.tsx
- pp/admin/subgroups/page.tsx

**Fix:** Add uildPageMetadata to each missing page. Pattern to follow:
`	s
export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Blog Posts',          // change per page
  description: 'Manage blog content.',  // change per page
  path: '/admin/blog',                   // change per page
});
`

Titles to use:
- dmin/blog ? "Admin – Blog Posts"
- dmin/invites ? "Admin – Invitations"
- dmin/partners ? "Admin – Partners"
- dmin/pipeline ? "Admin – Hiring Pipeline"
- dmin/subgroups ? "Admin – Subgroups"

---

## Fix 12: Admin — "Soft Delete" and "Reset Assessment" need confirmation dialogs

**File:** Find the component rendering these buttons (likely in pp/admin/members/[id]/ page or an admin member actions component).

**Soft Delete:** Wrap in a confirmation modal. Must require typing the member's name or clicking a clearly labeled "Yes, delete" button:
`	sx
// Replace direct delete button with:
<AdminConfirmAction
  label="Soft Delete Account"
  confirmText={Type "" to confirm}
  expectedValue={memberName}
  destructive
  onConfirm={() => handleSoftDelete(memberId)}
/>
`

Create components/admin/AdminConfirmAction.tsx — reusable destructive action component with:
- Red trigger button
- Modal overlay
- Explanation text
- Text input that must match expectedValue
- Disabled confirm button until match
- Cancel button

**Reset Assessment:** Same pattern, but confirmText="Type 'reset' to confirm" and expectedValue="reset".

---

## Updated File Checklist
All items from the original Sprint 9 list, plus:
- [ ] pp/api/admin/programs/catalog/route.ts — auto-seed when rows = 0 (Fix 10B)
- [ ] pp/admin/blog/page.tsx — add metadata (Fix 11)
- [ ] pp/admin/invites/page.tsx — add metadata (Fix 11)
- [ ] pp/admin/partners/page.tsx — add metadata (Fix 11)
- [ ] pp/admin/pipeline/page.tsx — add metadata (Fix 11)
- [ ] pp/admin/subgroups/page.tsx — add metadata (Fix 11)
- [ ] components/admin/AdminConfirmAction.tsx — new reusable destructive confirm (Fix 12)
- [ ] Admin member detail page — use AdminConfirmAction for Soft Delete + Reset Assessment (Fix 12)
