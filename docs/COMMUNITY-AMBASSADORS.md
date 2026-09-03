# Community Ambassadors — setup and student assignment

_Added 9/2/26 (website adjustments, issue 10)._

Community Ambassadors are trusted community members who bring students to
WorkforceAP and help them finish. In the portal they **are counselors** with
the affiliation `community_ambassador`: they get a unique sign-in, a login
code, a Counselor Profile, and a "My members" list that shows only the
students staff assign to them.

## 1. Invite the ambassador (admin)

1. Go to **Admin → Invites → New invite** (`/admin/invites/new`).
2. Email: the ambassador's address. Role: **Counselor**.
3. Counselor type: **Community Ambassador**. Leave "Partner affiliation" alone.
4. Send. The invitation email carries both an **Accept Invitation** link and a
   **login code** (`XXXX-XXXX`). The same code shows in the admin invites
   table next to the pending invite, so you can also read it to them over the
   phone or hand it to them on paper.

The invite expires in 7 days; **Resend** in the invites table issues a fresh
email with the same code.

## 2. The ambassador signs up

- Click the link, **or** open `https://www.workforceap.org/invite`, enter the
  email the invite was sent to plus the login code.
- Set a password (this is their unique sign-in from now on).
- They land on **Counselor portal → My profile** (`/counselor/profile`) to set
  up their Counselor Profile: name, phone, and a short title such as
  "Community Ambassador, East Austin".

## 3. Assign students to the ambassador (admin)

- One student: **Admin → Members → (member) → Counselor assignment**, pick the
  ambassador. The member gets a portal notification and an email; a message
  thread between the two is opened automatically.
- Many students: **Admin → Members → select → Bulk update → Assign counselor**.
- A student can have one active counselor at a time; re-assigning moves them.

### Automatic assignment from the apply form

Students name who referred them under "How did you hear about WorkforceAP?"
(choose **Community Ambassador (write in)** and type the ambassador's name) or
in the optional "Partner or community ambassador referral" field. When that
text matches **exactly one** active Community Ambassador (by full name,
case- and accent-insensitive, or by email) in the same organisation, the
student is assigned to that ambassador automatically at signup — the
ambassador gets a portal notification, the student gets the usual "you have a
new advisor" email, and the assignment note records the referral text. The
same happens when a member fills in the dashboard eligibility questionnaire.

It never guesses: a misspelled name, two ambassadors with the same name, or a
student who already has a counselor is left for staff. Use the eligibility
datasheet (`/admin/eligibility`, "ambassador" column) to catch those and
assign them by hand or in bulk.

## 4. What the ambassador sees

- **My members** (`/counselor/students`): only their assigned students, with
  program, progress, WIOA screening and preassessment answers, and notes.
- **Messages** and **Inbox zero** for those students.
- **My profile** to keep their details current.

They cannot see other counselors' students, change programs, or reach admin
tools.

## Where this lives in code

- Affiliation enum: `prisma/schema.prisma` (`CounselorAffiliation.community_ambassador`),
  migration `20260903120000_community_ambassador_counselors`.
- Invite creation and login code: `app/api/admin/invites/route.ts`,
  `lib/invitations/loginCode.ts`, `emails/invitation.ts`.
- Code redemption: `app/api/invite/validate/route.ts` (`?code=&email=`), `app/invite/page.tsx`.
- Accept → counselor row: `app/api/invite/accept/route.ts` (`ensureCounselorRow`).
- Profile: `app/(portal)/counselor/profile/`, `app/api/counselor/profile/route.ts`.
- Assignment: `app/api/admin/members/[id]/counselor/route.ts`, bulk in
  `app/api/admin/members/bulk-update/route.ts`.
- Auto-assignment from referrals: `lib/counselor/ambassadorReferral.ts`
  (matching), `lib/counselor/ambassadorAutoAssign.ts` (assignment), called
  from the apply signup, member eligibility, and public `/q` submit routes.
