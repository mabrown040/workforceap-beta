# Concordia High School Launch Runbook

Operations runbook for the 2026 Concordia High School (CHS) enrollment pilot.
Phase A (static page + partner script) and Phase B (dynamic page, auto-stamp,
school apply, admin form, guardian consent) are both in product.

## Overview

- **Student link:** https://www.workforceap.org/enroll/concordia — no code to type. Final from day 1.
- **Partner slug:** `concordia` — **must** match the `/enroll/<segment>` above (`lib/partners/chsPartner.ts`). Middleware plants a 30-day `wap_partner_ref` cookie; CTAs also carry `?ref=chs2026`.
- **Referral code:** `chs2026` — also works at `/apply?ref=chs2026` (per-program: `/apply?ref=chs2026&program=<slug>`).
- **Sponsorship window:** 2026-01-01 → 2026-12-31 UTC, term label `2026`, funding source `PARTNER_ORG`. Outside that window nothing is stamped automatically — extend `sponsorshipEndsAt` in `/admin/partners` before the pilot rolls into a new term.
- **Seat cap: intentionally unset (uncapped).** Spend is controlled by the manual Coursera activation gate (`courseraEnrollmentApproved` per consented student).
- **The partnership:** Concordia High School students enroll in WorkforceAP programs at no cost to Concordia High School students for 2026 — sponsored through the WorkforceAP–Concordia partnership. Partner contact: Dr. Marianne Rader ([marianne.rader@chsaustin.org](mailto:marianne.rader@chsaustin.org)) — receives a partner enrollment ack email on each student signup when `notifyOnEnrollment=true`.
- **Enrollment ack emails (on school signup):**
  - **Student** — automatic application receipt (`sendApplicationConfirmationEmail`)
  - **Parent/guardian** — when under 18 and `parentGuardianEmail` present (`sendSchoolEnrollmentParentAckEmail`) — includes 24–48 hour program enrollment timeline
  - **CHS administrator** — partner `contactEmail` (`sendSchoolEnrollmentPartnerAckEmail`) — one email per signup (not duplicated with `sendPartnerNewMemberAssignedEmail`)
- **24–48 hour messaging:** School enroll page and apply confirmation (`?school=1`) tell students to allow 24–48 hours for program enrollment setup — distinct from adult WIOA advisor 1–2 business day copy.
- **Where attribution lands:**
  - `Application.referralSource = 'partner_ref:chs2026'`
  - A `PartnerReferral` roster row under the CHS partner
  - Primary `CourseEnrollment` stamped `fundingSource = PARTNER_ORG` + `sponsoredByPartnerId` on **create** (signup auto-stamp). Existing enrollments are never overwritten.
  - Funnel strip on the partner detail page: Referred / Pending / Approved / Consented / Activated

## One-Time Launch Steps

1. Deploy the merged branch to production.
2. Create or backfill the partner record (sponsorship flags + 13-program catalog). Required or `/enroll/concordia` 404s:
   ```bash
   node scripts/prisma-env.js npx tsx scripts/create-chs-partner.ts
   node scripts/prisma-env.js npx tsx scripts/invite-chs-partner-admin.ts
   ```
   Expect a one-line `CREATED`/`UPDATED` summary with the partner id, `slug=concordia`, `referralCode=chs2026`, `sponsoredEnrollment=true`, `contactEmail=marianne.rader@chsaustin.org`, `notifyOnEnrollment=true`, and `seatCap=uncapped`. If `sponsoredEnrollment` is not true, the automatic funding stamp will not fire.
3. **Prod smoke-test checklist:**
   - [ ] Visit `/enroll/concordia` on mobile **and** desktop; page renders, all 13 programs listed, CTAs work. URL is `/enroll/concordia`, not `/en/enroll/concordia`.
   - [ ] Click a program CTA → `/apply?ref=chs2026&program=…`. Income/employment questions are **hidden**. Grade level is required. Under 18 requires guardian name + email.
   - [ ] Complete a throwaway signup via a program card CTA, using the **Under 18** age band.
   - [ ] Verify in admin: Application is **PENDING** with `referralSource = 'partner_ref:chs2026'` and a `PartnerReferral` row exists under the CHS partner.
   - [ ] Verify the primary enrollment shows `fundingSource = PARTNER_ORG` **without** running `stamp-chs-funding.ts`.
   - [ ] Verify both Resend emails (verification + confirmation) and the admin alert fired.
   - [ ] For an under-18 test signup with guardian email: verify parent ack email and CHS partner ack to marianne.rader@chsaustin.org.
   - [ ] Confirm apply confirmation shows 24–48 hour program enrollment copy (`/apply/confirmation?school=1`).
   - [ ] Verify the test member is **ABSENT** from `/admin/wioa-screening` (CHS students are not WIOA-screened).
   - [ ] On the member detail page, record consent (or copy the guardian consent link and submit `/consent/<token>`).
   - [ ] Confirm Coursera approval is blocked until consent is on file, then approve after consent.
   - [ ] Bulk-approve the test application with the attestation checkbox.
   - [ ] Erase the test member.

`scripts/stamp-chs-funding.ts` remains for **legacy** Phase A signups that predate auto-stamp. Do not run it as the default launch path.

## GATE — Before Sending the School Email

Confirm the available Coursera B4B seat count is **≥ the expected CHS cohort size**. Every activation consumes a paid seat — see `docs/COURSERA-ENROLLMENT-FLOW.md`. Do not send the email below until seats are confirmed.

Also still needed from Mike (not inventable in code):

1. Confirm the 13-program list. The curated catalog lives in `PROGRAM_SLUGS` in `scripts/create-chs-partner.ts`, which is the source of truth — `syncCatalog` deletes any catalog row whose slug is missing from it, so a program added only in SQL or `/admin/partners` is lost on the next run. Note several display titles differ from their slugs after renames: `cybersecurity-professional-certificate-google` renders as "Networking and Cybersecurity Professional Certificate (CompTIA Net+, Sec+)", and `data-analytics-professional-certificate-google` as "Management and Data Analyst Professional Certificate (Google/IBM)".
2. Confirm Dr. Rader's email for the partner record (`marianne.rader@chsaustin.org` is what the script and draft use).
3. Sign off the consent one-pager the school will collect.
4. Confirm Coursera B4B seats before the email goes out.

## Ongoing Cadence (Daily During Launch Week, Then Tue/Fri)

Review daily during launch week, then settle into a Tue/Fri cadence. Each review:

1. Review pending CHS applications (filter by the CHS partner / `partner_ref:chs2026`). The partner detail funnel strip is the at-a-glance view.
2. Cross-check **each** applicant against the school's consent roster, or send a tokenized guardian link from the member consent panel.
3. Bulk-approve **ONLY** consented students. For this cohort, the attestation checkbox means **"consent verified."**
4. Flip `courseraEnrollmentApproved` **ONLY** for students who are both approved **and** consented. The admin toggle refuses a minor without `parentalConsentGiven`.

## Consent Rules

- Consent gates **SEAT ACTIVATION**, never signup. Students may apply immediately; nothing is activated until consent is on file.
- v1: the school collects signed guardian packets (or a consented roster). Admin records that on the member **Minor / guardian consent** panel, or the guardian submits `/consent/<token>`.
- **Guardian revocation:** un-flip `courseraEnrollmentApproved`, clear `parentalConsentGiven` if needed, pause the enrollment, and notify the school.

## School #2 (no new code)

On `/admin/partners/new` (or Edit on an existing partner):

1. Set partner type `high_school`, a unique referral code, and contact email.
2. Turn on **Sponsored enrollment** and **Publish enrollment page**.
3. Set term label + curated program list.
4. Student link becomes `/enroll/<short-slug>` automatically (`riverside-high-school` → `/enroll/riverside`).

`scripts/seed-partner-school.ts` is for fixtures. It refuses the production Concordia slug unless `--force`. Production Concordia stays owned by `create-chs-partner.ts`.

## Week 2 — Partner Portal

Invite Dr. Rader to the partner portal via the **Invite** button on `/admin/partners/<id>`, or run `scripts/invite-chs-partner-admin.ts` in production (sets contact + `notifyOnEnrollment`, prints invite steps). Roster, milestones, and exports work today.

## Failure Playbook

| Failure | What happens | Fix |
| --- | --- | --- |
| Student bypasses the link (uses the standard Apply page) | **NO partner attribution** unless the `wap_partner_ref` cookie is still set from an earlier visit | Reconcile the pending queue against the school roster by name/email. Link the member to the partner on the member detail page. |
| `/enroll/concordia` 404s | Partner missing, inactive, `enrollmentPageEnabled` off, or catalog empty | Re-run `create-chs-partner.ts`. |
| Duplicate email (student already has an account) | Signup blocked on existing email | Student logs in, or resets their password. |
| Verification email filtered by school mail | Student never verifies | Personal-email fallback for the student; ask CHS IT to allowlist workforceap.org sending domains. |
| Admin tries to approve Coursera for a minor without consent | API returns 409; toggle stays off | Record the school packet or send the guardian consent link first. |

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
3. Complete the application — about 10 minutes. A school email address is recommended, but a personal email is perfectly fine. Income and employment questions are skipped for Concordia students.
4. Click the link in the verification email that arrives right after.
5. Watch for the welcome email once our team reviews the application.

**For students under 18:** they can apply now — nothing is activated until consent is in place. WorkforceAP provides a one-page parent/guardian consent form; the school returns the signed forms (or a consented roster with guardian names and contact information), and we activate each student as their consent arrives.

**One small ask for your IT team:** please allowlist workforceap.org email domains so verification and welcome emails reach student inboxes.

On timing: allow **24–48 hours** for our team to enroll students into their chosen program after they apply — it's a manual setup process. Guardian consent for under-18 students is collected by the school before training activates.

And on cost, to say it plainly for families: there is no cost to your students or their families for the 2026 program year — sponsored through the WorkforceAP–Concordia partnership; students are never asked for payment information.

If any student gets stuck at any step, please have them (or you) contact me directly and we will sort it out quickly. We are honored to serve your students.

Respectfully,

Michael A. Brown, PMP, ChE
Executive Director
Workforce Advancement Project
www.WorkforceAP.org
(512) 825-2896

## Later follow-ups

- Extend `under_18` to the dashboard eligibility form (`app/(portal)/dashboard/eligibility/page.tsx`), `/api/member/eligibility`, and the `/api/q/[token]/submit` value lists.
- Dedicated guardian-consent email template (today the admin copies the link).
