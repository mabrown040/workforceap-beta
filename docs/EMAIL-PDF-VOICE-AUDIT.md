# Email, PDF export, and resume voice coach — audit

**Generated:** operational reference for transactional email triggers, PDF branding, and the resume voice-coach UX (including apply/dismiss flows).

---

## 1. How email works in this repo

| Layer | Role |
|-------|------|
| **Transport** | [Resend](https://resend.com) via `RESEND_API_KEY`. If missing, send helpers log a warning and return `{ ok: false }`. |
| **From address** | `EMAIL_FROM` or default `WorkforceAP <hello@workforceap.org>`. |
| **Primary layout** | `brandedEmailLayout()` in `lib/email/template.ts` — dark header, logo (`NEXT_PUBLIC_SITE_URL` or org branding), white body, footer with org name + link. Optional org bundle from `getOrganizationBranding()`. |
| **Body fragments** | Most flows use HTML string builders in `emails/*.ts`, composed inside `lib/email.ts` and wrapped with `brandedEmailLayout()`. |
| **React Email `.tsx`** | Files under `emails/*.tsx` (e.g. `Layout.tsx`, `MagicLink.tsx`) exist for design previews / future migration; **production sends for member transactional mail use the string templates + `brandedEmailLayout`**, not `@react-email/render`, unless a specific route imports otherwise. |
| **Admin preview** | `app/admin/email-templates/page.tsx` and `app/api/admin/email-crons/[id]/template-preview/route.ts` render sample HTML for selected templates. |

### Out-of-repo / not wrapped by `brandedEmailLayout`

| Flow | Notes |
|------|--------|
| **Password reset** | `sendPasswordResetEmail` → Supabase `resetPasswordForEmail`. Email body and branding are controlled in the **Supabase Auth dashboard**, not this codebase. Redirect URL respects org custom domain via `getOrganizationBranding`. |

---

## 2. Transactional emails — template → send function → how it fires

“Works” = code path exists and respects `RESEND_API_KEY`; production delivery also requires cron schedules / Vercel cron or equivalent.

### Member-facing (WorkforceAP programs)

| Content source | Send helper (`lib/email.ts`) | Typical trigger |
|----------------|------------------------------|-----------------|
| `application-confirmation.ts` | `sendApplicationConfirmationEmail` | `app/api/apply/signup/route.ts`, `app/api/apply/confirmation-email/route.ts` |
| `application-accepted.ts` | `sendApplicationAcceptedEmail` | Admin member status → accepted (`app/api/admin/members/[id]/status/route.ts`) |
| `application-rejected.ts` | `sendApplicationRejectedEmail` | Admin member status → rejected |
| `enrollment-confirmation.ts` | `sendEnrollmentConfirmationEmail` | Admin enrollment / status flows |
| `course-enrolled.ts` | `sendCourseEnrolledEmail` | `app/api/member/enroll/route.ts` |
| `course-completed.ts` | `sendCourseCompletedEmail` | `lib/member/courseCompletion.ts`, cron `milestone-celebration` |
| `weekly-recap.ts` | `sendWeeklyRecapEmail` | Cron `app/api/cron/weekly-recap/route.ts` |
| `inactive-nudge.ts` | `sendInactiveNudgeEmail` | Crons `inactive-nudge`, `inactivity-nudge`; counselor `app/api/counselor/remind-member/route.ts` |
| `counselor-assigned.ts` | `sendCounselorAssignedEmail` | `app/api/admin/members/[id]/counselor/route.ts` |
| `applicant-followup.ts` | `sendApplicantFollowupEmail` | Cron `applicant-followup`, admin pipeline remind |
| Interview prep bundle (inline HTML in `lib/email.ts`) | `sendInterviewPrepBundleEmail` | `app/api/member/prep-bundle/send/route.ts` |
| Interview prep / debrief (inline) | `sendInterviewPrepReminderEmail`, `sendInterviewDebriefPromptEmail` | Cron `app/api/cron/interview-reminders/route.ts` |
| Pre-screening ready (inline) | `sendPreScreeningReadyEmail` | `app/api/member/pre-screening/route.ts` |
| Assessment reset (inline) | `sendAssessmentResetNotificationEmail` | `app/api/member/assessment/reset/route.ts` |

### Voice / AI (staff or member copy)

| Send helper | Trigger |
|-------------|---------|
| `sendVoiceCoachTranscriptEmail` | Counselor feedback POST, member voice-interview transcript, resume-coach `parse-suggestions`, career-business-coach completion, etc. Recipients: `getVoiceCoachTranscriptRecipients()` (env `VOICE_COACH_TRANSCRIPT_EMAILS`, defaults in code). |
| `sendVoiceCoachArtifactEmail` | `app/api/ai/elevator-pitch/route.ts` (artifact path) |
| `sendVoiceInterviewTranscriptEmail` | `app/api/interview/history/route.ts` |
| `sendElevatorSpeechEmail` | Elevator pitch completion email to member |

### Employer / jobs

| Template | Send helper | Trigger |
|----------|-------------|---------|
| `job-submitted.ts` | `sendJobSubmittedEmail` | Employer job create/update |
| `job-approved.ts` / `job-rejected.ts` | `sendJobApprovedEmail` / `sendJobRejectedEmail` | Admin job approve/reject |
| `new-job-application.ts` | `sendNewJobApplicationEmail` | Member applies to internal job |
| `ai-match-suggestion.ts` | `sendAIMatchSuggestionEmail` / `sendMatchActionEmail` | Admin suggest matches |

### Admin / partner / invites

| Template | Send helper | Trigger |
|----------|-------------|---------|
| `new-application-alert.ts` | `sendNewApplicationAdminEmail` | New applicant signup / application |
| `admin-pending-applicants.ts` | `sendAdminPendingApplicantsEmail` | Cron applicant-followup batch |
| `admin-weekly-recap.ts` | `sendAdminWeeklyRecapEmail` | Cron `weekly-recap-email` |
| `invitation.ts` | `sendInvitationEmail` | Admin invites, resend |
| `invitation-accepted.ts` | `sendInvitationAcceptedEmail` | Invite accept flow |
| `partner-referral-invite.ts` | `sendPartnerReferralInviteEmail` | Partner invitations |
| `partner-weekly-digest.ts` | `sendPartnerWeeklyDigestEmail` | Cron `partner-outcome-digest` |

### Counselor session packet

| Source | Trigger |
|--------|---------|
| `emails/session-packet.ts` (`sessionPacketHtml`) | `app/api/counselor/sessions/email-packet/route.ts` — builds **per-section PDFs** via pdf-lib + attaches HTML email |

---

## 3. PDF exports — branding and behavior

| Route / consumer | Branding |
|------------------|----------|
| **`POST /api/ai/export-pdf`** (`app/api/ai/export-pdf/route.ts`) | Accent header bar (`#ad2c4d`), embedded `public/images/wap_logo.png`, meta line (“Generated by WorkforceAP …”), footer on every page: `Workforce Advancement Project · workforceap.org · Page x of y`. Supports skill-map radar (`chartData`) and PNG embed. **Requires authenticated session.** |
| **Skill Mapper / Comparison** (`SkillMapperClient.tsx`) | Same API with chart payloads. |
| **`ExportPdfButton` / `AiResultRenderer`** (`components/portal/AiResultRenderer.tsx`) | Posts `{ text, title, toolName }` for AI history downloads; title includes tool label + input summary when available. |
| **Counselor email packet** (`email-packet/route.ts`) | pdf-lib with header/footer pattern aligned to AI export; multiple attachments per tool section. |

**Limitations:** Body uses **StandardFonts Helvetica** — complex Unicode or emoji may render incorrectly; export normalizes common punctuation where implemented in the route.

---

## 4. Resume voice coach — apply/dismiss (already in product)

**File:** `components/portal/ResumeCoachWorkspace.tsx`

- Live draft syncs to the coach; suggestions arrive from **heuristics** (`extractResumeCoachSuggestionsFromText`), **`/api/member/resume-coach/live-suggestions`**, and **post-session** `parse-suggestions`.
- **Replace** suggestions where `original` text exists in the draft: **inline preview** above the textarea (strikethrough + proposed text) with **✓ Apply** / **✕ Dismiss**.
- **Other** suggestions appear as stacked cards with the same actions.
- **Add-only** suggestions (no `original`): surfaced in the suggestion queue; inline preview can be enabled for the active add-only item (see recent UX commits).

**Related API routes**

- `POST /api/member/resume-coach/parse-suggestions` — structured suggestions + optional staff email via `sendVoiceCoachTranscriptEmail`.
- `POST /api/member/resume-coach/live-suggestions` — lightweight suggestions during session.

---

## 5. “Resume builder” vs plain-text draft

- **Profile resume upload** lives under `/api/member/resume` and dashboard resume UI (`ResumeClient.tsx`) — supports PDF/DOC/DOCX storage and preview.
- **Voice coach panel** edits **plain text** (`/api/member/resume/plain-text`) for AI/coach context — optimized for coaching speed, not ATS PDF layout. For a **submission-ready file**, members should export from Word/Google Docs or use uploaded files as source of truth.

---

## 6. Operational checklist

1. **`RESEND_API_KEY`** set in production; optional **`EMAIL_FROM`**.
2. **`NEXT_PUBLIC_SITE_URL`** matches canonical site for links and logo in emails/PDFs.
3. **Crons** registered for: weekly recap, inactive nudges, interview reminders, partner digest, applicant followup, etc. (`lib/admin/cronRegistry.ts`).
4. **Supabase** email templates reviewed separately for password reset branding.

---

## 7. Suggested follow-ups (product/engineering)

- Unify accent color between `lib/email/template.ts` default (`#4a9b4f`) and marketing accent (`#ad2c4d`) where intentional.
- Migrate high-volume templates to shared React Email components **or** ensure all string templates use `brandedEmailLayout` + escapeHtml (audit ongoing in white-label work).
- Optional: member-facing **in-app** duplicate of critical cron emails (interview reminder) so inbox is not a single point of failure.
