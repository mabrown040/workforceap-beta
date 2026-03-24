# Sprint 8c: Portal Tooltip Tour + Dev Reset

Two additions to the onboarding system:
1. A post-wizard tooltip tour that highlights key nav items after first login
2. A dev-only "Reset onboarding" button so admins can re-test without touching the DB

---

## Part 1: Tooltip Tour (all 3 portals)

### Library
Use **no external library** — build a lightweight tooltip tour with Tailwind only.

### Core component: `components/onboarding/PortalTour.tsx`

```ts
interface TourStep {
  targetId: string;      // data-tour="jobs-nav" on the target element
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';  // default: 'right'
}

interface PortalTourProps {
  steps: TourStep[];
  onComplete: () => void;
}
```

**Behavior:**
- Renders after the onboarding wizard closes (pass `showTour` state from wizard completion)
- Highlights target element with a subtle ring (`ring-2 ring-blue-500 ring-offset-2`)
- Shows a popover card near the highlighted element with: title, body, "X of N" counter, Back/Next/Done buttons
- Dims the rest of the page with a semi-transparent overlay (backdrop, z-40) but keeps the highlighted element visible (z-50, no dimming on it)
- Scrolls to each target element if off-screen
- ESC or clicking outside dismisses immediately (saves tour as complete)
- After final step → calls `POST /api/onboarding/tour-complete` with `{ portal }`

### API Route: `app/api/onboarding/tour-complete/route.ts`
```ts
POST /api/onboarding/tour-complete
Body: { portal: 'member' | 'employer' | 'partner' }
```
Sets `tourCompletedAt = now()` on the correct model (same pattern as `/api/onboarding/complete`).

### Schema addition (add to migration `20260325000001_onboarding_tour`)
```prisma
// Add to User model:
tourCompletedAt   DateTime?

// Add to Employer model:
tourCompletedAt   DateTime?

// Add to Partner model:
tourCompletedAt   DateTime?
```

---

### Employer Tour Steps

Add `data-tour="[id]"` attributes to these elements in `EmployerPortalShell.tsx` or the nav component:

| data-tour ID | Target element | Tour title | Body |
|---|---|---|---|
| `tour-overview` | Overview nav link | "Your Dashboard" | "See active job stats, pending work, and alerts at a glance." |
| `tour-work-queue` | Work queue nav link | "Work Queue" | "Daily action items — candidates to review, interviews to schedule, stale postings." |
| `tour-jobs` | Jobs nav link | "Job Postings" | "Post new roles, import from your ATS or LinkedIn, and manage live postings." |
| `tour-applicants` | Applicants nav link | "Applicants" | "Review every candidate who applied. Filter by program, status, or match score." |
| `tour-pipeline` | Pipeline nav link | "Hiring Pipeline" | "Track candidates from reviewed → interviewed → offered. Kanban-style." |
| `tour-matches` | Matches nav link | "AI Matches" | "AI-suggested candidates for your open roles based on skills and program fit." |
| `tour-post-job` | "Post a job" CTA button on overview page | "Post Your First Job" | "Takes about 2 minutes. We'll match you with qualified candidates automatically." |

**Trigger:** In `app/(portal)/employer/page.tsx` — after `onboardingCompletedAt` is set, check `tourCompletedAt`. If null, pass `showTour={true}` to the employer dashboard client component.

---

### Member Tour Steps

Add `data-tour` attributes to member portal nav:

| data-tour ID | Target | Title | Body |
|---|---|---|---|
| `tour-dashboard` | Dashboard/Overview nav | "Your Home Base" | "Track your application status, program progress, and next steps." |
| `tour-profile` | Profile nav link | "Complete Your Profile" | "A complete profile helps us match you to jobs faster." |
| `tour-programs` | Programs/Learning nav | "Your Program" | "Course materials, progress tracking, and certification milestones." |
| `tour-jobs` | Jobs nav link | "Job Board" | "Curated jobs matched to your program and skills. Apply directly." |
| `tour-resources` | Resources nav link | "Resources" | "Resume templates, interview prep, and career guides." |

---

### Partner Tour Steps

| data-tour ID | Target | Title | Body |
|---|---|---|---|
| `tour-overview` | Partner overview nav | "Partner Dashboard" | "Your referred members and their current status — all in one view." |
| `tour-members` | Members nav link | "Your Members" | "Everyone you've referred. Click any member to see their full journey." |
| `tour-attention` | Attention queue nav | "Needs Attention" | "Members who may need a nudge — stalled applications, inactive, at risk." |
| `tour-outcomes` | Outcomes nav link | "Outcomes" | "Track placements and employment outcomes for your referrals." |
| `tour-referral-link` | Referral link on overview | "Your Referral Link" | "Share this link with community members to track their journey back to you." |

---

## Part 2: Dev Reset Button

### API Route: `app/api/onboarding/reset/route.ts`

```ts
POST /api/onboarding/reset
Body: { portal: 'member' | 'employer' | 'partner' }
```

- **Only available when `process.env.NODE_ENV !== 'production'` OR caller is a super_admin**
- Check: `isSuperAdmin(user.id)` — if not super_admin AND in production → return 403
- Sets `onboardingCompletedAt = null` and `tourCompletedAt = null` on the appropriate model
- Returns `{ ok: true }`

### UI: Reset button in each portal dashboard (dev/admin only)

In `app/(portal)/employer/page.tsx`, `app/(portal)/dashboard/page.tsx`, and `app/(portal)/partner/page.tsx`:

Fetch whether current user is super_admin (already available via `isSuperAdmin()`). If true, render a small reset button in the bottom-right corner:

```tsx
{isSuperAdmin && (
  <div className="fixed bottom-4 right-4 z-50">
    <button
      onClick={async () => {
        await fetch('/api/onboarding/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portal: 'employer' }), // or 'member' | 'partner'
        });
        window.location.reload();
      }}
      className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-gray-700 opacity-60 hover:opacity-100 transition-opacity"
    >
      🔄 Reset onboarding
    </button>
  </div>
)}
```

Mike's email is `mabrown040@gmail.com` — already seeded as `super_admin`. The reset button will appear for him on all three portals immediately.

---

## Flow Summary

```
First login
  → onboardingCompletedAt = null → show Wizard
  → Wizard completes → POST /api/onboarding/complete → onboardingCompletedAt = now()
  → tourCompletedAt = null → show PortalTour
  → Tour completes → POST /api/onboarding/tour-complete → tourCompletedAt = now()
  → All future logins: both null checks false → nothing shown

Dev/admin reset:
  → Click "Reset onboarding" button
  → POST /api/onboarding/reset → both fields = null
  → page.reload() → wizard + tour show again
```

---

## File Checklist
- [ ] `prisma/migrations/20260325000001_onboarding_tour/migration.sql` — tourCompletedAt on User, Employer, Partner
- [ ] `prisma/schema.prisma` — tourCompletedAt fields
- [ ] `app/api/onboarding/tour-complete/route.ts`
- [ ] `app/api/onboarding/reset/route.ts` (super_admin only)
- [ ] `components/onboarding/PortalTour.tsx` (shared tour engine)
- [ ] Add `data-tour="..."` attributes to nav items in employer/member/partner shell components
- [ ] Update `app/(portal)/employer/page.tsx` — pass `showTour` + `isSuperAdmin` to client
- [ ] Update `app/(portal)/dashboard/page.tsx` — same
- [ ] Update `app/(portal)/partner/page.tsx` — same
- [ ] `EmployerOnboardingWizard.tsx` — on complete, trigger tour (set showTour state)
- [ ] `MemberOnboardingWizard.tsx` — same
- [ ] `PartnerOnboardingWizard.tsx` — same

## Quality Bar
- TypeScript strict — no `any`
- Tailwind only — no external tour library
- Tour works on mobile (375px) — popover repositions below target if no room above/right
- `npx tsc --noEmit` must pass
- Reset button only visible to super_admin users
