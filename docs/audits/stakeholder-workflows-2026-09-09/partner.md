# Partner workflow audit and bounded implementation

Date: 2026-09-09. Baseline: production `dfd49fa9`. Method: source tracing, synthetic component/API regressions, and a guarded optimized local browser run; no live partner records, submissions, messages, or email sends. Homepage unchanged.

## The three workflow blockers

1. **Referral sharing loses attribution in the default journey — bug, high impact.** The default branch in `app/(portal)/partner/page.tsx` returned before constructing/rendering the existing referral URL. Its “New referral” action led to `/partner/guide`, whose step2 linked bare `/apply` and asked the applicant to type the partner name. `components/apply/ApplyRefCapture.tsx:11` explicitly clears persisted referral attribution on bare `/apply`. The proper `/apply?ref=…` link and copy templates existed only below the legacy overview return. This makes partners manually reconcile referrals and can leave a valid application absent from their view.
   - Implemented: one URL builder (`lib/partner/referralLink.ts`), existing attribution surfaced on default overview and guide, visible manual-copy fallback, and attributed email/social copy on the guide. Sharing copies only; it never sends. Copy explicitly leaves eligibility, training approval, and required funding to WorkforceAP.
   - Coverage: real copy UI tests verify exact encoded referral code, clipboard denial recovery, templates retaining attribution, and zero fetches on copying.

2. **Active trainees disappear from follow-up — bug, high impact.** `lib/partner/attentionQueue.ts` previously continued past every stage except `applied` and `enrolled`. `lib/pipeline/stage.ts:56` changes a learner to `in_training` after the first completed course, so the very next stage removes them from the partner’s attention queue regardless of how long they have been quiet. The queue also treated a saved enrollment as permission to begin training.
   - Implemented: retain `in_training`, resolve the immutable course assignment, distinguish a pre-training enrollment without approval as “Training approval pending,” and suggest contacting WorkforceAP about approval/funding before asking the learner to start. Actual observed course activity remains visible even if an old approval flag is missing. The API and badge helper now pass the organization boundary explicitly; the queue requires an active partner and same-org active member role.
   - Coverage: first-course/active-training regression, stale program-pointer resolution, approved versus pending enrollment, legacy activity without approval flag, terminal-stage exclusion, and scope predicates.
   - Limit: urgency still derives from `User.updatedAt`, not a verified training inactivity measure. UI explicitly calls it profile-update recency. The existing newest 500-referral cap remains; it needs server pagination/full-cohort processing before claiming complete follow-up coverage at that size. Stage calculation still relies on `MemberProgramProgress`; a legacy learner with only raw `CourseProgress` rows can be labelled enrolled until that rollup exists. The browser fixture therefore supplied a matching rollup for its separately created synthetic active learner; existing fixture learners were not changed.

3. **Long conversations hide current replies after reload — bug, high impact.** `app/(portal)/partner/messages/page.tsx` selected the oldest200 messages (`createdAt asc` with a cap); `/api/partner/messages` selected the oldest500. `components/portal/PortalTeamChatClient.tsx` initializes from that window and subscribes only to future inserts. A reply after the cap vanishes on reload. The client also marks the thread read on mount, making an unseen reply lose its unread signal.
   - Implemented: read the newest200/500 with deterministic timestamp+ID ordering, then return them chronologically. Existing auth gates and member-context handoff remain; context now shares the member-role boundary with detail reads.
   - Coverage: synthetic205/505-message histories prove the newest reply remains present, oldest overflow falls out, and displayed order is chronological. Anonymous/non-partner access remains denied.
   - Follow-up implemented with the counselor owner: partner read acknowledgements now name the last rendered message; the shared helper resolves it inside the authorized existing conversation and advances monotonically. Empty legacy requests do not mark unseen replies read, and read-only audit requests do not write or provision threads. The shared team composer retains drafts typed during a pending send and guards duplicate submission.
   - Remaining limit: read-through columns store timestamps, so messages with identical timestamps cannot be distinguished. Reconnect catch-up and older-history pagination remain future work.

## Access boundary found alongside the workflow audit

**A same-org learner UUID could grant partner access — authorization bug, addressed before UI expansion.** `app/api/partner/referrals/route.ts` previously checked only that a User existed in the same organization, then created a `PartnerReferral`. That relationship grants the partner referred-member detail and export access. It did not require existing attribution or staff approval; knowing the ID was enough. The referrer auditor independently identified the same path.

The partner POST now only acknowledges an existing active, same-org, member-role relationship and returns200 without writes. Unrelated, deleted, staff, and cross-org records return an indistinguishable404. Authorized referral creation remains in the separate admin assignment (`app/api/admin/members/[id]/partner/route.ts`), admin member creation, and application signup flows. The partner detail reader also requires the same active/org/member boundary before reading learner data. Tests cover retries and all denial cases and assert no creation or broad User lookup.

## One useful addition using existing permissions and data

**A personal follow-up view: “Mine / Unassigned / All,” with last outreach date and author.** Owner assignment (`PartnerReferral.assignedPartnerUserId`) and outreach logs already exist. Currently the queue can assign owners but cannot filter to a colleague’s own work, and “Last touch” shows a name without a date. Returning partners must rescan every row and open histories to avoid duplicate calls.

Bounded proposal: URL-backed owner filters on the existing attention queue, project the latest outreach timestamp/author per authorized member, and keep risk/profile recency separate from contact recency. Retain the same scoped rows and existing manual outreach actions. No new schema, automatic notifications, inferred due date, or access expansion. Test assigned-to-self versus another teammate/unassigned, URL restoration, mixed contact histories, and foreign/deleted member exclusion. This addition is proposed, not implemented in this slice.

## Existing tools preserved and further gaps

- **Already available:** partner overview and funnel; referred-member progress with frozen curriculum; outreach notes and team assignment; partner-team conversation with server-validated member context; milestone feed; three CSV presets; email/social templates; payout surfaces only for the referral-partner track. These are not proposed as new features. The member detail now has a direct “Ask WorkforceAP about this member” link into that existing reviewable conversation.
- **Outcomes trust mismatch:** `app/(portal)/partner/outcomes/page.tsx:65` counts every placement record, while `app/api/partner/export/referrals/route.ts:83` fills placement outcome columns only when `startDateVerified` is true. `lib/partner/referralBundle.ts` also builds “Placed at…” story text from any placement record, including in CSV. Dashboard/story/export definitions should be aligned before calling all figures verified. No outcome definition was silently changed in this slice.
- **Export completeness:** “All referrals” promises every member/last update, but the shared bundle caps at500 and the CSV does not include `User.updatedAt`. Add paginated/streamed full export or disclose the window; use a clear update column and match the on-screen cohort.
- **Attention error recovery:** `PartnerAttentionClient` only handles a failed queue GET. Failed outreach/member/team GETs can leave permanent loading or disabled inputs; owner PATCH failure has no visible error; a successful note save reloads the whole page and can erase edits made while the request was pending. These remain separate, reproducible reliability work; do not add bulk outreach before fixing them.
- **Scope consistency:** bundle export reads are explicitly organization/member scoped; some older overview/event readers still rely on the referral relationship alone. The new partner POST cannot create unauthorized relationships, but historical malformed rows need the same predicate in every read path. No live data inspection or repair occurred.
- **Visual limits:** the guide’s existing resource layout and other legacy panels remain. Browser review reproduced a preexisting mobile chat bug: `scrollIntoView()` scrolled the outer page so most of the conversation sat above the viewport. The bounded follow-up now scrolls only the message log, preserving reduced-motion preferences. Two regressions failed on the old behavior and pass after the fix. Rebuilt browser checks at 375px in both themes and 1440px light verified initial outer scroll stays at zero and the newest reply, composer, and Send button fit together after intentional page scrolling. Both mobile screenshots were opened and inspected; `scroll-fix-verification.json` records the results.

## Verification

Focused suites:

```sh
npx vitest run tests/api/partner-routes.spec.ts tests/api/partner-message-history.spec.ts tests/app/partner-contextual-messages.spec.tsx tests/app/partner-referral-pages.spec.tsx tests/lib/partner-attention-queue.spec.ts tests/components/partner-referral-share.spec.tsx tests/components/portal-team-chat-read-cursor.spec.tsx
npm run typecheck
```

The separate independent admin regression in `tests/app/admin-command-center-pagination.spec.tsx` verifies last-page shrink, oversized URL recovery, zero-result recovery, preservation of total counts, the existing admin gate, and explicit loader failure. It does not mutate admin source.

### Completed local proof

- Eight focused suites passed after the scroll follow-up: **68 tests**. The preexisting contextual-draft component suite also passed, bringing the directly affected total to **69 tests**, including the separate admin server pagination suite. The optimized application build passed before the browser run.
- The built partner overview, guide, and attention queue passed at **375, 768, and 1440px**, in **light and dark** modes, with no page exceptions or horizontal overflow. Representative screenshots were opened and visually inspected.
- The default overview and guide exposed the same attributed application URL. The guide contained the existing email copy tool. A synthetic learner with three completed courses and a matching progress rollup remained **In Training** in attention.
- Live local API calls returned **200** for an already authorized referral and **404** for unrelated/foreign members; the referral count was unchanged. No application, message, or email was submitted.
- A synthetic 205-message conversation rendered the latest **200** in chronological order. The client acknowledged the exact last rendered message. An older cursor and an empty request did not advance or rewind its persisted read timestamp; a foreign cursor returned **400**.
- Guarded browser evidence is outside the repository at `/home/claw/artifacts/workforceap-stakeholder-workflows-2026-09-09/partner/verification.json`, alongside screenshots. Private fixture IDs, credentials, and cleanup instructions remain under `/tmp/wap-stakeholder-workflows-20260909/partner-fixture`; no credentials are included in the report. The fixture only uses local Postgres on port 55437 and local fake Auth on port 54327, with outbound email explicitly disabled and external browser requests blocked.
