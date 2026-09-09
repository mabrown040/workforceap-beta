# Referrer and shared-member journey — 2026-09-09

Read-only audit of branch `codex/stakeholder-workflows-20260909`, based on live `dfd49fa9`. No application, schema, or test changes and no live messages or data mutations were made during this audit. Repository `AGENTS.md` and `docs/KIT_GUIDE.md` were read.

## Actual roles and permission boundaries

| Journey | Existing surface and data | Permissible visibility and handoff |
| --- | --- | --- |
| A member invites a friend | `app/(portal)/dashboard/points/ReferralShareCard.tsx`; `GET /api/member/referral`; `ReferralCode` and `ReferralConversion` in `prisma/schema.prisma:2478` | Own code, share path, and aggregate rewarded count only. The API returns no referred learner names, applications, grades, placement or counselor notes. No separate general-referrer role or portal was found. |
| A partner refers learners | `/partner`, `/partner/guide`, `/partner/referred-members`; `Partner`, `PartnerUser`, `PartnerReferral`; separate `/apply?ref=` or `/enroll/<slug>` links | `getPartnerForUser` establishes the partner account; `loadPartnerReferralBundle` constrains partner and members to its organization and referral relationships. Partner visibility is broader than member referrals and must not be inherited merely by possessing a member referral code. |
| Partner sends a referral invitation | `POST /api/partner/invitations`; `components/portal/PartnerInviteMemberButton.tsx` | Explicit email submission sends a partner-attributed application link and records workflow/event history. It does not create a durable `Invitation` row or grant access to a learner before an authorized referral relationship exists. |
| Staff provisions a role/account invitation | `/admin/invites`; `app/api/admin/invites/route.ts`; `Invitation` in `prisma/schema.prisma:1512` | Admin role and organization scope, expiring token, pending/accepted/revoked status, inviter and accepted identity. This is separate from member sharing and partner application-link emails. |
| Community ambassador | `CounselorAffiliation.community_ambassador`, optional intake `partnerAmbassadorReferral` text | An affiliation or intake source is not a new blanket permission to inspect learner records. Existing counselor assignment/organization checks remain authoritative. |

Partner notifications use `notifyOnEnrollment`, `notifyOnCourse`, `notifyOnCertified`, and `notifyOnPlaced`, then the partner's configured contact address (`lib/notifications/partner-notify.ts:49`). No automatic learner-progress notifications to general member referrers were found. A member referral should remain a sharing/reward journey, not a monitoring portal.

## Three concrete gaps

### 1. A failed points award permanently strands a referral marked rewarded

`lib/member/referrals.ts:96–117` checks whether any conversion exists, creates a `status: rewarded` conversion, and only then calls `awardPoints` twice. If either award fails, the conversion remains counted as rewarded. The next call exits because `alreadyReferred` is true. `lib/member/points.ts:29–50` itself writes its ledger and cached total separately, so historical ledger/counter divergence must not be guessed repaired.

Read-only reproduction loaded the actual referral module with in-memory Prisma/points doubles, failed the first points award, then retried. Output:

```json
{"firstError":"Synthetic points failure","persistedStatus":"rewarded","pointAwardAttempts":1,"retryResult":false,"retryRepairsReward":false}
```

**Consequence:** the sharer sees a rewarded/enrolled aggregate while one or both promised point awards may be missing. Current `lib/member/referrals.test.ts` covers pure eligibility/code rules and reward constants; it does not exercise this persistence failure.

**Bounded fix:** one explicit system-scoped transaction for the conversion, both unique point-ledger entries, both counter changes, and final reward status. Repeated/concurrent calls must preserve the first referrer and cannot double-increment. Existing rewarded conversions with a missing ledger entry may receive only that missing award on retry; an existing ledger entry with an uncertain cached total needs reconciliation, not a blind second increment. Do not run a global historical repair or change unrelated points events.

### 2. Attribution is browser-only and bypassed by major enrollment paths

`app/r/[code]/route.ts:9–23` places a 30-day `wap_mref` cookie and redirects to `/apply`. Repository-wide references show only `app/api/member/enroll/route.ts:150–155` reads it for rewards. That operation runs after the response and swallows errors. Signup creates course enrollment directly (`app/api/apply/signup/route.ts:515–553`), and staff program assignment also upserts enrollment (`app/api/admin/members/[id]/program/route.ts:125`); neither calls the referral reward helper. Signup does not persist this member referral cookie on the user or a pending conversion.

**Consequence:** a friend can follow the shared application link and enroll through signup or staff onboarding without receiving the promised referral reward. Switching devices or losing the cookie also loses attribution. This is separate from partner `?ref=` attribution, which signup does persist.

**Existing-schema option:** `ReferralConversion.status` already supports `pending`, with unique `refereeUserId`, referrer/referee/code and creation timestamp. After authenticated account creation, a validated non-self referral could be recorded as pending and later rewarded using a deliberately defined enrollment trigger. Preserve the original attribution, validate active identities, and keep partner source attribution independent. This needs coordinated lifecycle wiring and product agreement on reservation versus approved enrollment; no schema addition is necessary for basic durable attribution. It is not part of the immediate bounded repair, and the share UI must not imply every onboarding path is already covered.

### 3. The share feature disappears on failure and provides little help sharing

`ReferralShareCard.tsx:27–41` fetches once and returns `null` on any API/parse error, leaving no error, retry, or explanation. It offers a copy-link button but no ready-to-send introduction or native share. Clipboard failure is silent (`:48–63`). The card is mounted only under `/dashboard/points` (`page.tsx:215–216`), reached through points widgets rather than a clear invite destination. This does not establish that the entire points page is inaccessible; it establishes that the referral task is hard to find and recover.

**Consequence:** referrers spend time writing their own explanation or assume inviting is unavailable after a transient failure. Broken clipboard permissions produce no useful feedback.

**Bounded fix:** keep the card visible with loading/error/retry states; offer selectable link, copy link, copy invitation text and native share when supported. Announce success/failure, handle native-share cancellation quietly, and preserve manual-copy fallback. Use the existing kit and tokens; no automatic email or new private data.

## High-value addition: an Invite-a-friend toolkit

Upgrade the existing card into a reliable sharing task with a short editable or copyable introduction, the referral link, what the recipient should expect, and a concise privacy/attribution explanation. Expose only the current user's code and aggregate reward count. Clearly distinguish points from cash and program selection from funding/enrollment approval; avoid guaranteed jobs, unconditional funding or universal reward promises. A dedicated nav entry can be considered by the shared-navigation owner after the card works, rather than creating a duplicate portal.

Suggested message: “I thought WorkforceAP's career training and support might interest you. You can explore programs and apply here: [link]. The team can explain eligibility, funding and next steps.” This makes the recipient's choice clear and contains no private member progress.

## Proposed implementation boundary and verification

Immediate ownership can stay in `lib/member/referrals.ts`, `app/api/member/referral/route.ts`, the existing `ReferralShareCard.tsx`, small referral-specific pure helpers if useful, and focused tests under `tests/lib`, `tests/api`, and `tests/components`. A narrowly scoped transaction-aware points helper in `lib/member/points.ts` is acceptable only if existing callers retain their behavior; avoid a general points rewrite. No Prisma schema/migration or broad signup/enrollment-path edits are required for the immediate repair/toolkit. The enrollment caller's silent error can be made observable separately if authorized.

Meaningful verification:

1. Fail either point award or final status update: all new referral/ledger/counter changes roll back; a later retry succeeds once.
2. Repeat and race the same referral: one attribution and one award per recipient/event/conversion; another code cannot replace it. Retry a historical conversion with one missing award without duplicating the existing award.
3. Reject unknown codes, self-referrals and unavailable identities. Exercise system GUC inside an explicit database transaction; confirm caller-supplied user IDs cannot widen the public API response.
4. API remains authenticated and returns only own code/share path/aggregate count; assert no learner names, IDs, email, progress, or partner private data are serialized.
5. UI tests cover failed fetch → visible retry → success, malformed responses, clipboard denial, copy-message content, native-share availability/cancellation, keyboard feedback and loading states.
6. Browser smoke uses synthetic fixtures and mocked sharing only. Do not send invitations or create live referrals to validate the UI.

Adjacent partner concern was sent to the partner auditor: `POST /api/partner/referrals` currently permits creating a relationship to any known same-organization member ID, which may subsequently unlock partner detail visibility. Verify the intended consent/assignment boundary before adding richer partner referral data. This audit does not broaden that access.

## Implemented after the audit

The selected reward repair and toolkit are implemented. `rewardReferralOnEnrollment` now uses one serializable system-scoped transaction for attribution, unique point receipts, counter/streak changes and final reward status. Serializable/unique conflicts have a bounded retry. Existing receipts are never incremented again; a missing award can be repaired on a subsequent invocation while original attribution and reward date are preserved. Existing ambiguous ledger/cache divergence remains a reconciliation case. No production backfill was run.

The own-referral count now requires both reward ledger receipts, preventing a stranded legacy `rewarded` status from inflating the displayed aggregate. The API returns only `code`, `sharePath`, and `rewardedCount`, using authenticated identity and ignoring caller-supplied user IDs.

`/dashboard/referrals` reuses the upgraded sharing component and has one explicit member navigation entry, “Invite a friend.” The component remains available on Points, shows visible load/retry/manual-copy states, provides a ready-to-send invitation message and native sharing when available, and keeps tracking limitations in expandable points guidance. Copy/share does not send an email. Neither surface exposes recipient names or progress. The dedicated page respects the existing read-only-audit suppression of lazy code creation.

Focused verification: **33 tests passed in four suites**, including authenticated page/nav access, API privacy, atomic rollback, concurrent retry, historical missing awards, malformed responses, clipboard failure, share cancellation and visible recovery. [Runner stdout](referrer-focused-verification.txt). Targeted ESLint passed with no findings; combined release checks and rendered browser verification belong to the release owner.

The actual referral module was also executed against the authorized disposable PostgreSQL database through real Prisma transactions. A forced second-recipient counter failure rolled back the conversion, both receipts and counters. Six simultaneous reward calls produced exactly one conversion and two awards. A synthetic historical missing award was repaired once, and the SQL aggregate required both receipts while remaining scoped to the referrer. Only two new task-owned local identities and their related proof records were used; cleanup and absence were verified. [Sanitized database proof](referrer-database-verification.json). The fixture adapter stamped system GUC within each transaction; this proof does not claim a production RLS/telemetry test.

Persistent signup attribution, all enrollment lifecycle paths, a historical points backfill and a general-referrer learner-progress view remain outside this change. Existing schema can support pending attribution later, but the current browser-only limitation described above remains real.

## Optimized browser verification and remaining hydration investigation

The synthetic-member invitation flow passed at 375, 768, and 1440 pixels in both light and dark themes. The browser exercised a visible 503/retry followed by the real local API, exact link/message copying, denied clipboard permissions with selectable manual fallback, and quiet native-share cancellation. No message was sent; browser mutations were blocked or mocked, and external network access was blocked. The real referral response contained exactly `code`, `sharePath`, and `rewardedCount`. All six final screenshots were visually inspected; mobile/tablet captures waited for the drawer-close transition to finish. Proof: `/home/claw/artifacts/workforceap-stakeholder-workflows-2026-09-09/referrer/verification.json` and `settled-screenshots.json`.

An intermittent React hydration error remains unresolved. It occurred on Referral and Points pages in earlier optimized contexts; both render the changed referral component, so Points is **not** an unchanged-component control. A separate 20-context optimized `/dashboard` dark control was clean, as were 20 isolated development contexts and a bounded eight-context shared-chunk timing probe. These clean runs do not erase the observed failures.

A Chrome debugger capture of a natural failure showed React expecting root `<main id="main-content">` under the root internationalization provider, while its hydration cursor was already at that main element's child `<div class="portal-touch-target">`. This locates the observed mismatch above the referral form; it does not establish which component or timing condition caused the cursor to advance. No speculative source fix or warning suppression was made. Detailed observations, limitations and sanitized evidence references are in the artifact directory's `hydration-diagnosis.md` and `optimized-shared-card-capture.json`. The release owner must assess this unresolved defect explicitly.

An actual unchanged deployed-revision comparison was then built in a detached worktree at `dfd49fa9adad1dfc37a62c9a855d823b4ec0cadc`. Its independent optimized build passed all 499 pages and retained an empty tracked diff. Forty fresh dark/mobile contexts (20 old Points, 20 Dashboard) produced no hydration errors with the same debugger breakpoint enabled. See `deployed-baseline-capture.json` in the artifact directory. This clean finite baseline does **not** prove a cause, but it prevents classifying the candidate's observed error as established pre-existing behavior; a regression remains possible.

The rebuilt candidate subsequently passed 40 fresh Referral/Points contexts, eight contexts with 6× CPU throttling, and four contexts that buffered the full HTML document before hydration. The exact baseline also passed eight CPU-throttled contexts. These additional checks did not reproduce the earlier failure, and no speculative global rendering change was made. Two actual `renderToString` → `hydrateRoot` regressions now check the referral card with native sharing present/absent: the server main/card nodes remain the same through hydration and fetched controls, with no recoverable hydration error. The sharing component suite passes 13 tests. These scoped tests do not claim to prove Next's full streaming root error fixed.
