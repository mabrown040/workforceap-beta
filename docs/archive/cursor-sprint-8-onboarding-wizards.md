# Sprint 8: First-Login Onboarding Wizards (All 3 Portals)

## Context
WorkforceAP has three authenticated portal experiences:
- **Member** — `/dashboard` — job seekers completing programs
- **Employer** — `/employer` — companies posting jobs and reviewing candidates
- **Partner** — `/partner` — referring organizations tracking member outcomes

Each needs a guided first-login wizard that runs once, collects critical setup info, and leaves users oriented in their portal.

## Shared Infrastructure (build first)

### 1. Migration — `20260325000000_onboarding_state`
Add to `prisma/schema.prisma` on the `User` model:
```prisma
onboardingCompletedAt DateTime?
onboardingPortal      String?   // 'member' | 'employer' | 'partner'
```
Add to `Employer` model:
```prisma
onboardingCompletedAt DateTime?
```
Add to `Partner` model:
```prisma
onboardingCompletedAt DateTime?
```
Run `npx prisma migrate dev --name onboarding_state` after schema changes.

### 2. API Route — `app/api/onboarding/complete/route.ts`
```ts
POST /api/onboarding/complete
Body: { portal: 'member' | 'employer' | 'partner' }
```
- Sets `onboardingCompletedAt = now()` on the correct model (User for member, Employer for employer, Partner for partner)
- Returns `{ ok: true }`
- Requires auth (reject if no session)

### 3. Shared component — `components/onboarding/OnboardingWizard.tsx`
Full-screen overlay modal (z-50, backdrop blur) with:
- Step indicator (dots or progress bar at top)
- Back / Next / Finish buttons
- Skip link (bottom right, small text) — sets onboardingCompletedAt immediately
- Portal-specific step content passed as `steps` prop
- On "Finish": calls `POST /api/onboarding/complete`, then dismisses

```ts
interface OnboardingStep {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

interface OnboardingWizardProps {
  portal: 'member' | 'employer' | 'partner';
  steps: OnboardingStep[];
  onComplete: () => void;
}
```

Use Tailwind only (no external library). Animate step transitions with a simple fade or slide. Match the existing WorkforceAP design system (blue primary, clean cards, rounded-xl).

---

## Portal 1: Member Onboarding Wizard

**Trigger:** `app/(portal)/dashboard/page.tsx` — if `user.onboardingCompletedAt` is null, render `<MemberOnboardingWizard />` above the dashboard content.

**File:** `components/onboarding/MemberOnboardingWizard.tsx`

**Steps:**

### Step 1 — Welcome
- Headline: "Welcome to WorkforceAP"
- Body: "You're one step closer to a new career. This quick setup (2 min) gets you on the path to a job."
- Illustration: simple icon or graphic (use Lucide icons)

### Step 2 — Complete Your Profile
- Show inline form fields (pre-filled from DB if available):
  - Full Name (required)
  - Phone number
  - City, State, ZIP
- On Next: PATCH `/api/profile` with values (reuse existing profile update endpoint)

### Step 3 — Pick Your Program Interest
- Show 3–4 program cards (fetch top programs from `/lib/content/programs.ts`)
- Single select
- On Next: save `programInterest` to user's application or profile (use existing application create or update)

### Step 4 — Quick Questions
- "Are you interested in financial aid?" (Yes / No / Not sure) → save to `Profile.financialAidInterest`
- "How did you hear about WorkforceAP?" (dropdown: Google, Referral, Social Media, Workforce Center, Other)

### Step 5 — You're In!
- Headline: "You're all set 🎉"
- Body: "Your counselor will reach out within 24 hours. Here's what to expect next."
- 3 bullet points: Apply → Enroll → Get Placed
- CTA: "Go to My Dashboard"

**Implementation notes:**
- Wrap in `'use client'` since it has interactive steps
- After Step 2 form save, do not block on error — continue with toast
- After Step 4 save financialAidInterest, call the existing profile PATCH
- On finish: call `POST /api/onboarding/complete` with `{ portal: 'member' }`

---

## Portal 2: Employer Onboarding Wizard

**Trigger:** `app/(portal)/employer/page.tsx` — if employer's `onboardingCompletedAt` is null, render `<EmployerOnboardingWizard />`.

**File:** `components/onboarding/EmployerOnboardingWizard.tsx`

**Steps:**

### Step 1 — Welcome
- Headline: "Welcome to the Employer Portal"
- Body: "Post jobs, review AI-matched candidates, and hire pre-screened talent from WorkforceAP programs."

### Step 2 — Company Setup
- Inline form:
  - Company name (pre-filled from Employer.companyName)
  - Industry (dropdown: Technology, Healthcare, Construction, Logistics, Finance, Retail, Other)
  - Company size (dropdown: 1–10, 11–50, 51–200, 200+)
  - Website URL (optional)
- On Next: PATCH `/api/employer/profile` with values

### Step 3 — How Hiring Works
- 3-step visual explainer:
  1. Post a job (takes 2 min)
  2. AI matches you with pre-screened candidates
  3. Review pipeline → schedule interviews
- No form fields — just orientation

### Step 4 — Post Your First Job?
- Two CTAs:
  - "Post a Job Now" → `/employer/jobs/new` (closes wizard first)
  - "Explore the Portal First" → finishes wizard, stays on dashboard
- On either: call `POST /api/onboarding/complete` with `{ portal: 'employer' }`

**Implementation notes:**
- Employer model uses `getEmployerForUser()` to get employer record
- Use existing `Employer` Prisma model fields; add `industry`, `companySize`, `website` columns if not present (add to migration above)

---

## Portal 3: Partner Onboarding Wizard

**Trigger:** `app/(portal)/partner/page.tsx` — if partner's `onboardingCompletedAt` is null, render `<PartnerOnboardingWizard />`.

**File:** `components/onboarding/PartnerOnboardingWizard.tsx`

**Steps:**

### Step 1 — Welcome
- Headline: "Welcome, Partner"
- Body: "Track your referred members, monitor their training progress, and celebrate placements — all in one place."

### Step 2 — Your Organization
- Inline form:
  - Organization name (pre-filled from Partner.orgName or similar)
  - Organization type (dropdown: Workforce Center, Nonprofit, Community College, Government Agency, Other)
  - Primary contact name
  - Primary contact phone
- On Next: PATCH `/api/partner/profile` with values (create if not exists)

### Step 3 — How Referrals Work
- Visual pipeline: Referred → Applied → Enrolled → Certified → Placed
- Explain: "When you refer a member with your partner link, you can track every step of their journey here."
- Show partner's referral link (fetch from `Partner.referralCode` or generate one)

### Step 4 — You're Ready
- Headline: "You're all set"
- Body: "Your dashboard shows all referred members and their current status."
- CTA: "Go to My Dashboard"
- On finish: call `POST /api/onboarding/complete` with `{ portal: 'partner' }`

---

## Schema Additions for Employer (add to migration)
If `Employer` model is missing these fields, add:
```prisma
industry    String?
companySize String?
website     String?
```

## File Checklist
- [ ] `prisma/migrations/20260325000000_onboarding_state/migration.sql`
- [ ] `prisma/schema.prisma` — onboardingCompletedAt on User, Employer, Partner
- [ ] `app/api/onboarding/complete/route.ts`
- [ ] `components/onboarding/OnboardingWizard.tsx` (shared base)
- [ ] `components/onboarding/MemberOnboardingWizard.tsx`
- [ ] `components/onboarding/EmployerOnboardingWizard.tsx`
- [ ] `components/onboarding/PartnerOnboardingWizard.tsx`
- [ ] Update `app/(portal)/dashboard/page.tsx` — trigger member wizard
- [ ] Update `app/(portal)/employer/page.tsx` — trigger employer wizard
- [ ] Update `app/(portal)/partner/page.tsx` — trigger partner wizard

## Quality Bar
- TypeScript strict — no `any`
- Tailwind only — no new CSS files
- Mobile responsive (wizard should work on 375px viewport)
- Accessible — focus trap in modal, ESC closes (sets onboardingCompletedAt)
- `npx tsc --noEmit` must pass after all changes
- No breaking changes to existing dashboard content (wizard renders above, not instead of)
