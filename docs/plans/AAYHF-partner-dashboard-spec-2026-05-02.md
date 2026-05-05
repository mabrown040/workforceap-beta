# AAYHF Partner Dashboard Spec

## Goal
Turn the partner portal into an accountability dashboard for referral partners — especially AAYHF — so they can see what happens to the people they send us, where each person is in the journey, and who needs intervention next.

## Product stance
- Show real progress, not vanity metrics.
- Use denominator-based outcomes.
- Make stalled members visible.
- Be explicit about what WorkforceAP owns vs. what the partner owns.
- Do not imply mature employer-network scale that does not yet exist.

## Primary partner questions
1. How many people did we refer?
2. How many actually applied?
3. Where is each person now?
4. Who is stuck and needs a check-in?
5. Who owns the next action?
6. What outcomes can we honestly report to leadership/funders?

## Core navigation
Keep the current IA, but sharpen the purpose of each page:
- `/partner` — executive overview + action queue summary
- `/partner/referred-members` — roster of every referred member
- `/partner/attention` — intervention queue for stalled or at-risk members
- `/partner/milestones` — concrete progress events
- `/partner/outcomes` — cohort-based reporting
- `/partner/guide` — fit criteria, referral rules, support model, partner responsibilities
- `/partner/exports` — exportable reports for internal and funder use

## Overview page (`/partner`)
### Top KPI row
Replace soft/ambiguous emphasis with these primary KPIs:
- Total referred
- Applied via referral link
- Enrolled
- In training
- Completed training
- Certified
- Placed
- Needs attention

### KPI definitions
- **Total referred** = unique `partnerReferral.memberId`
- **Applied via referral link** = unique applications with `referralPartnerId = partnerId`
- **Enrolled** = pipeline stage `enrolled` or beyond
- **In training** = pipeline stage `in_training`
- **Completed training** = all required program courses complete
- **Certified** = at least one `userCertification`
- **Placed** = `placementRecord` exists
- **Needs attention** = actionable rows from attention queue; default excludes `watch`

### Main modules
1. **Action banner**
   - headline like: `6 members need follow-up this week`
   - CTA to `/partner/attention`
2. **Pipeline snapshot**
   - applied → enrolled → in training → certified → placed
   - counts + conversion percentages between stages
3. **Member roster preview**
   - top 5-10 referred members
   - columns: member, stage, progress %, next milestone, owner, risk, last update
4. **Near completion block**
   - members at 70%+ progress
5. **Recent verified outcomes**
   - placed members, credentials earned, major milestones
6. **Referral attribution block**
   - referral link usage, referred members who never applied, and a clean CTA to share the link

## Referred members page (`/partner/referred-members`)
### Required columns
- Member name
- Referred date
- Program
- Current stage
- Progress %
- Next milestone
- Risk tier
- Assigned counselor / owner
- Last meaningful update
- Placement status

### Filters
- Stage
- Risk tier
- Program
- Assigned owner
- Date range
- Needs attention only

### Member detail page (`/partner/referred-members/[memberId]`)
Add/keep:
- timeline of milestones
- certifications
- placement record
- last outreach / touchpoint
- next recommended action
- support/escalation note for partner-safe visibility

## Attention queue (`/partner/attention`)
This should become the operational heart of the partner portal.

### Default sort
1. high risk
2. medium risk
3. low risk
4. newest stale date within tier

### Each row should show
- member
- stage
- stale days
- risk tier
- assigned partner user
- counselor owner
- last touch
- next best action
- one-click action options:
  - log outreach
  - mark attempted contact
  - assign owner
  - open member detail

### Risk signals
Keep current stale-day logic, then expand with:
- applied but no application progress after X days
- enrolled but no course progress after X days
- in training with 0% progress after X days
- missed milestone / no recent event
- no assigned owner

## Milestones page (`/partner/milestones`)
Organize around trust-building evidence:
- applications submitted
- enrollments confirmed
- coursework progress thresholds
- certifications earned
- placement verified

Each event should include:
- member name
- event type
- event date
- optional label/details
- owner if known

## Outcomes page (`/partner/outcomes`)
### Required reporting cards
- total referred
- total applied
- application conversion rate
- training completion rate
- certification rate
- placement rate
- median days from referral to placement

### Reporting rules
- Always show denominator in label or helper text.
- Allow cohort/date filters.
- Separate `placed` from `interviewing` or `in pipeline`.
- No vague claims like “success rate” without explicit numerator/denominator.

### Visualizations
- cohort funnel
- monthly referral trend
- placement trend
- program mix by referred members

## Guide page (`/partner/guide`)
Must answer four things clearly:
1. Who is a fit?
2. Who is not a fit yet?
3. What happens after referral?
4. What does WorkforceAP handle vs. what should the partner do?

### AAYHF-specific content
- target participant profile
- readiness expectations
- example path to employment
- what support AAYHF should provide during stall moments
- how to explain “no-cost to members” accurately

## Data model / backend needs
Current primitives already help:
- `partnerReferral`
- `application.referralPartnerId`
- `memberEvent`
- `partnerOutreachLog`
- `placementRecord`
- `userCertification`
- pipeline stage helpers in `lib/pipeline/stage`
- referral bundle loader in `lib/partner/referralBundle.ts`
- attention queue builder in `lib/partner/attentionQueue.ts`

### Recommended additions
1. **Owner visibility**
   - expose counselor owner consistently in partner-facing queries
2. **Last meaningful update**
   - derive from latest milestone/outreach/progress event, not only `member.updatedAt`
3. **Next milestone label**
   - helper derived from stage + program progress
4. **Outcome cohorts**
   - reusable date-windowed reporting helper for partner outcomes
5. **Partner-safe notes**
   - explicit field or filtered note surface safe for partner viewing

## UX rules
- Mobile-first; AAYHF users may review on phones.
- Large tap targets.
- Plain language over workforce jargon.
- Status colors must be consistent across overview, member list, and attention queue.
- Every metric card should answer “so what?” with a short hint.

## Implementation slices
### Slice 1 — trust + safety
- tighten KPI definitions
- add denominator helper text
- promote attention queue from secondary page to top-level overview CTA

### Slice 2 — member accountability
- add owner / last update / next milestone to referred members list
- improve member detail timelines

### Slice 3 — outcomes reporting
- cohort filters
- honest conversion cards
- export-ready outcome summaries

### Slice 4 — AAYHF polish
- fit criteria copy
- support workflow copy
- partner-specific guide examples

## Acceptance criteria
- A partner can identify stalled members in under 30 seconds.
- A partner can explain current funnel counts without staff help.
- Outcomes page uses explicit numerators/denominators.
- No page implies job placement guarantees or employer scale that is not yet real.
- Mobile review of attention queue and member roster is usable without pinch-zoom.
