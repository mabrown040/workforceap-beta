# Concordia High School Launch Runbook (Phase A)

Operations runbook for the 2026 Concordia High School (CHS) enrollment pilot.

## Overview

- **Student link:** https://www.workforceap.org/enroll/concordia
- **Partner slug:** `concordia` — **must** match the `/enroll/<segment>` above. That URL segment IS the partner slug: middleware derives the partner ref from it, drops a 30-day attribution cookie, and `/api/apply/signup` resolves it against `Partner.slug`. If the two ever drift, students who use the link get no attribution and no funding stamp. The constant lives in `lib/partners/chsPartner.ts` (`CHS_PARTNER_SLUG`) and is pinned by `lib/partners/chsPartner.test.ts`.
- **Referral code:** `chs2026` — the link carries it automatically; it also works directly at `/apply?ref=chs2026` (per-program: `/apply?ref=chs2026&program=<slug>`).
- **Sponsorship window:** 2026-01-01 → 2026-12-31 UTC, term label `2026`, funding source `PARTNER_ORG`. Outside that window nothing is stamped automatically — extend `sponsorshipEndsAt` in `/admin/partners` before the pilot rolls into a new term.
- **Seat cap: intentionally unset (uncapped).** Spend is controlled by the manual Coursera activation gate below (`courseraEnrollmentApproved` per consented student), which is the real limiter. A seat cap here would only add a second limiter that silently leaves students unfunded with a staff-only alert. Set one in `/admin/partners` only if you deliberately want that behavior.
- **The partnership:** Concordia High School students enroll in WorkforceAP programs at no cost to Concordia High School students for 2026 — sponsored through the WorkforceAP–Concordia partnership. Partner contact: Dr. Marianne Rader (marianne.rader@chsaustin.org).
- **Where attribution lands:**
  - `Application.referralSource = 'partner_ref:chs2026'`
  - A `PartnerReferral` roster row under the CHS partner
  - Visible on the partner detail page at `/admin/partners` (CHS partner detail)

## One-Time Launch Steps

1. Deploy the merged branch to production.
2. Create the partner record against prod:
   ```bash
   node scripts/prisma-env.js npx tsx scripts/create-chs-partner.ts
   ```
   Expect a one-line `CREATED`/`UPDATED` summary with the partner id, `slug=concordia`, `referralCode=chs2026`, `sponsoredEnrollment=true`, and `seatCap=uncapped`. If `sponsoredEnrollment` is not true, the automatic funding stamp will not fire.
3. **Prod smoke-test checklist:**
   - [ ] Visit `/enroll/concordia` on mobile **and** desktop; page renders, programs listed, CTAs work.
   - [ ] Complete a throwaway signup via a program card CTA, using the **Under 18** age band.
   - [ ] Verify in admin: Application is **PENDING** with `referralSource = 'partner_ref:chs2026'` and a `PartnerReferral` row exists under the CHS partner.
   - [ ] Verify both Resend emails (verification + confirmation) and the admin alert fired.
   - [ ] Verify the test member is **ABSENT** from `/admin/wioa-screening` (CHS students are not WIOA-screened).
   - [ ] Bulk-approve the test application with the attestation checkbox.
   - [ ] Run the funding stamp script:
     ```bash
     node scripts/prisma-env.js npx tsx scripts/stamp-chs-funding.ts
     ```
   - [ ] Verify the test member's primary enrollment shows `fundingSource = PARTNER_ORG`.
   - [ ] Erase the test member.

## GATE — Before Sending the School Email

Confirm the available Coursera B4B seat count is **≥ the expected CHS cohort size**. Every activation consumes a paid seat — see `docs/COURSERA-ENROLLMENT-FLOW.md`. Do not send the email below until seats are confirmed.

## Ongoing Cadence (Daily During Launch Week, Then Tue/Fri)

Review daily during launch week, then settle into a Tue/Fri cadence. Each review:

1. Review pending CHS applications (filter by the CHS partner / `partner_ref:chs2026`).
2. Cross-check **each** applicant against the school's consent roster.
3. Bulk-approve **ONLY** consented students. For this cohort, the attestation checkbox means **"consent verified."**
4. Run the stamp script after each approval batch (until Phase B automates it):
   ```bash
   node scripts/prisma-env.js npx tsx scripts/stamp-chs-funding.ts
   ```
5. Flip `courseraEnrollmentApproved` **ONLY** for students who are both approved **and** consented.

## Consent Rules

- Consent gates **SEAT ACTIVATION**, never signup. Students may apply immediately; nothing is activated until consent is on file.
- Minors' Profile consent fields (`isMinor`, guardian fields, `parentalConsentGiven`, `schoolName`) are **backfilled by admin** from the school's returned forms/roster. A structured admin write path ships in Phase B — until then, the school's signed forms plus a roster spreadsheet ARE the record.
- **Guardian revocation:** un-flip `courseraEnrollmentApproved`, pause the enrollment, and notify the school.

## Week 2 — Partner Portal

Invite Dr. Rader (or a designated counselor) to the partner portal via the **Invite** button on `/admin/partners/<id>`. Roster, milestones, and exports work today.

## Failure Playbook

| Failure | What happens | Fix |
| --- | --- | --- |
| Student bypasses the link (uses the standard Apply page) | **NO partner attribution** | Reconcile the pending queue against the school roster by name/email. An admin linking affordance ships in Phase B; until then track manually. |
| Duplicate email (student already has an account) | Signup blocked on existing email | Student logs in, or resets their password. |
| Verification email filtered by school mail | Student never verifies | Personal-email fallback for the student; ask CHS IT to allowlist workforceap.org sending domains. |

## The Email — Ready-to-Send Draft

**To:** marianne.rader@chsaustin.org
**Subject:** Concordia students' enrollment link is ready

Dear Dr. Rader,

Thank you again for your partnership and for the thoughtful questions — I hope this answers them fully.

To your main question: your students will **not** use our standard Apply Now page, and there is **no code for them to type**. We built Concordia its own enrollment page, and the link below carries everything automatically:

**https://www.workforceap.org/enroll/concordia**

Here is what a student does, start to finish:

1. Open the link and review the programs on the page.
2. Pick one and click **Get Started**.
3. Complete the application — about 10 minutes. A school email address is recommended, but a personal email is perfectly fine.
4. Click the link in the verification email that arrives right after.
5. Watch for the welcome email once our team reviews the application.

One note so nobody is confused: two of the application questions ask about income and employment. Those exist for other funding programs and **do not affect Concordia students** in any way.

**For students under 18:** they can apply now — nothing is activated until consent is in place. WorkforceAP provides a one-page parent/guardian consent form; the school returns the signed forms (or a consented roster with guardian names and contact information), and we activate each student as their consent arrives.

**One small ask for your IT team:** please allowlist workforceap.org email domains so verification and welcome emails reach student inboxes.

On timing: our advisors review applications within 1–2 business days of submission.

And on cost, to say it plainly for families: there is no cost to your students or their families for the 2026 program year — sponsored through the WorkforceAP–Concordia partnership; students are never asked for payment information.

If any student gets stuck at any step, please have them (or you) contact me directly and we will sort it out quickly. We are honored to serve your students.

Respectfully,

Michael A. Brown, PMP, ChE
Executive Director
Workforce Advancement Project
www.WorkforceAP.org
(512) 825-2896

## Follow-ups (Phase B)

- Extend `under_18` to the dashboard eligibility form (`app/(portal)/dashboard/eligibility/page.tsx`), `/api/member/eligibility`, and the `/api/q/[token]/submit` value lists.
- Admin "link member to partner" affordance (for students who bypass the referral link).
- Structured admin write path for minor/consent Profile fields (`isMinor`, guardian fields, `parentalConsentGiven`, `schoolName`).
- Sponsorship auto-stamping replaces `scripts/stamp-chs-funding.ts`.
