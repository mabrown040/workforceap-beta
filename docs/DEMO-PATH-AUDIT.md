# Demo Path Audit

**Date:** 2026-05-07
**Audience:** Mike / Dad before walking into TWC, AAUL, or a corporate co-funder room
**Purpose:** Walk the live demo path end-to-end, surface every friction point, and tag each as fix-now / fix-before-demo / acceptable.

The demo path Mike will most likely run is the **fresh applicant flow**:

1. Marketing site → `/apply`
2. `/apply/create-account` (form)
3. Submit → either `/dashboard` (immediate session) or `/login` (verify email first)
4. From `/dashboard`, walk through the next-step card and one AI tool
5. (Optional) Switch to admin/counselor view to show the new application landing in the queue

---

## What's working ✅

These were verified working against current `master` and don't need attention before a demo:

- **Fresh applicant signup** — `POST /api/apply/signup` creates Supabase auth user, upserts `User`, creates `CourseEnrollment`, creates `Profile`, creates `Application`, optionally creates `PartnerReferral`. All in one transaction.
- **Email confirmation to member** — Member receives `sendApplicationConfirmationEmail` immediately on signup. Wired in PR #1027.
- **Admin alert** — `info@workforceap.org` receives `sendNewApplicationAdminEmail` with a deep link. Wired in PR #1027.
- **Email-verification mode** — `ApplyCreateAccountForm.tsx` correctly switches to a "check your inbox" panel when Supabase returns no session. The verify-email screen exists and shows the user's email.
- **Dashboard fresh-visit** — `dashboardState === 'A'` (no program, no application) shows an unmistakable gradient CTA: "Apply now — 10 minutes" or "Choose your program."
- **Counselor triage** — A new applicant won't appear in any red flag yet (no inactivity, no SLA breach), but will appear naturally as activity unfolds. PR #1025 makes this surface live.
- **Outcomes truth-set** — A demo can pull `/admin/outcomes` to show defensible numbers; even N=0 is shown honestly with sample-size suppression. PR #1024.

---

## Friction surface — fix before a real demo 🟡

### F1. Apply-confirmation page targets users who haven't signed up

**Where:** `app/apply/confirmation/page.tsx`

**What:** This page is for users who completed the eligibility quiz but **didn't** sign up. The "Recommended next step" card and the "What you can do now" list both push the user to create an account.

**Why it matters in a demo:** The standard signup flow does NOT route through this page — `/api/apply/signup` redirects to `/dashboard` (or `/login` if email verification is on), never to `/apply/confirmation`. So in a normal demo, you won't see this page. **But** if Mike clicks "Apply" from the eligibility page without filling in account details, he lands here, and the entire screen is built around "create your account now" — which will look weird for a logged-in admin demo'ing the platform.

**Fix:** When the confirmation page detects the user is already authenticated, swap the "create account" CTAs for "Open your dashboard." Server-side check via `getUser()` plus a conditional component swap. ~30 minutes of work; not in scope for the current demo-audit PR.

**Workaround for the demo:** Don't navigate to `/apply/confirmation` directly. Walk the full signup flow.

---

### F2. Email-verification gate slows the demo

**Where:** Supabase Auth + `app/apply/create-account/ApplyCreateAccountForm.tsx`

**What:** If Supabase email confirmation is on in the production project, the signup returns no session, the form switches to "check your inbox," and the user has to click a link in an email before they can log in. In a live demo this means: **wait for an email, switch tabs, click verify, switch back**.

**Why it matters:** A 30-second pause in a 5-minute demo is fatal. If the email is delayed by Resend or marked as spam, the demo is broken.

**Fix options:**
1. **Recommended for the demo only:** Pre-create a demo applicant account via `/admin/members/create` so Mike can log in directly without the verification step.
2. **Production:** If Supabase email confirmation is currently optional in the project, leave it off. If on, ensure deliverability is well-tested.

**Workaround for the demo:** Use a pre-created demo account; don't sign up live unless deliverability is rock-solid.

---

### F3. Brand color drift (visible across nav, buttons, gradients)

**Where:** Multiple files using inline `#C41E3A` / `#8B0000` instead of brand crimson.

**Status:** Fixed in PR #1026 (still open at audit time). Once that merges, every wrong-red surface inherits brand crimson `#ad2c4d` / `#8c0f37` automatically.

**Workaround for the demo:** None needed if PR #1026 lands first.

---

### F4. Mobile touch targets on nav CTAs

**Where:** `.nav-cta`, `.nav-apply-btn`, etc.

**Status:** Fixed in PR #1026. Same gating.

**Workaround for the demo:** Demo on desktop, or wait for PR #1026.

---

### F5. The "first email" the new member sees has correct copy but no Dad voice

**Where:** `lib/email.ts` (`sendApplicationConfirmationEmail`) → `emails/application-confirmation.ts`

**What:** The confirmation email body is functional ("Thanks for applying. A counselor will review.") but doesn't open with the stewardship tone Dad uses elsewhere. For the audience this platform serves, the first email is a trust moment.

**Why it matters:** A faith-driven, mission-forward member opens an email expecting some warmth and gets a transactional template. Not a demo-breaker, but a "feels generic" moment.

**Fix:** A 5-minute copy edit by Dad. Out of scope for code; queued as a brand voice review item.

**Workaround for the demo:** Skip showing the email body in the demo; just demonstrate "and they get a confirmation immediately."

---

## Acceptable / not-blocking 🟢

- **`/apply/status` lookup-by-email.** Works. Returns "found" / "not found" with a clear message. Fine.
- **Applying via partner referral link** (`?ref=<code>`). The signup route resolves the partner and creates a `PartnerReferral` row. Works.
- **Counselor sign-in path.** `/login?redirectTo=/counselor` works.
- **Admin "new application" alert email.** Wired in PR #1027.

---

## Pre-demo checklist (paste into your prep doc)

Run through this 10 minutes before a real demo:

- [ ] PR #1026 (brand integrity) and PR #1027 (notifications) are both merged to master and deployed
- [ ] At least 1 demo applicant pre-created so you can log in without the email-verify pause
- [ ] At least 1 counselor account exists with that demo applicant assigned
- [ ] `/admin/outcomes` returns without errors (small numbers OK; the page itself must render)
- [ ] `/counselor/triage` returns without errors and shows at least one row of any color
- [ ] Resend API key is set in the deployed environment so the new-application email actually fires
- [ ] You know which audience-tier demo you're running and have rehearsed the corresponding 5-minute path

---

## What this audit deliberately does not cover

- **Employer portal demo** — separate audit; Track C deliverable.
- **Partner portal demo** — separate audit; would benefit from a partner-specific run-through.
- **Mobile-only demo flow** — overlaps with PR #1026 mobile fixes; redo this audit on a real phone after #1026 lands.

---

*Audit by the Track B agent on 2026-05-07. Re-run after any major change to `/apply`, `/dashboard`, or the email pipeline.*
