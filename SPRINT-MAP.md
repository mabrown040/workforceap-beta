# WorkforceAP next-sprint map

## Strategic thesis

WorkforceAP should not spend the next sprint proving it can build more software. The repo already contains the shape of a serious workforce OS: public conversion pages, member portal, counselor/admin operations, partner portal, employer portal, Coursera integration, AI tools, outcomes reporting, tenant groundwork, and procurement-grade SLO docs.

The next sprint must prove the business loop is real:

> A referred or self-serve adult enters WorkforceAP, completes the right next action, receives counselor/automation follow-up, progresses in training, and produces a verified outcome that a partner, employer, or funder can trust.

Everything below is sequenced around that loop.

---

## 1) Biggest strategic opportunities

### 1. Closed-loop outcome proof is the moat

The strongest product asset is not any single AI tool. It is the connected data path across:

- public acquisition: `/`, `/find-your-path`, `/programs`, `/apply`
- member activation: `/dashboard`, next-step cards, training, AI tools, messages
- counselor/admin operations: applications, lifecycle, readiness, outcomes
- partner proof: referrals, milestones, exports, outcomes
- employer demand: jobs, matches, candidates, applications

Most workforce products can show training or job posts. WorkforceAP can credibly show the whole chain from referral to placement, if the operational surfaces are tightened. That is the platform story for TWC, AAUL, Goodwill-style partners, corporate co-funders, and future licensees.

**Product implication:** the next sprint should ship proof, not breadth. Prioritize the few features that make the loop demonstrable end-to-end.

### 2. Member-led growth is the fastest path to real numbers

The Q2 outcome doc correctly names the primary persona: the active enrolled member. That is the right wedge because funding and partner trust both depend on completion, job search, placement, and follow-up.

The member dashboard already has:

- next-step logic
- engagement signals
- program/training views
- Coursera progress hooks
- messages
- AI tools
- weekly recap surface

The opportunity is to turn those into an operating cadence: "do this next," "counselor sees who is stuck," "member gets pulled back in," "progress is measured."

**Product implication:** activation and retention instrumentation matter more than adding another member feature.

### 3. Coursera data can become funder-grade evidence

The Coursera backlog shows working access to org, users, programs, content, enrollment reports, and gradebook reports. That means WorkforceAP can move from "member says they completed training" to "system verifies progress/completion from the training provider."

High-leverage next uses:

- stale learner detection
- counselor caseload progress
- certification creation from verified completions
- outcome data hardening before placement claims

**Product implication:** use Coursera as the training truth source for the next sprint's proof loop.

### 4. Partner and white-label readiness are real revenue leverage, but only if trust is defensible

The docs show a clear expansion wedge: AAUL / aligned org licensing, custom domains, org branding, partner outcome exports. Schema and custom-domain work are partially in place. But tenant isolation and org-aware email/UI still have gaps.

This is strategically important because licensing is the highest-leverage revenue stream, but it is also the easiest to kill with one data-leak concern.

**Product implication:** do not sell multi-tenant platform confidence until endpoint scoping, email branding, and isolation tests are credible.

### 5. Employer access is the commercial unlock after training proof

The employer portal is broad: jobs, import, candidates, matches, pipeline, work queue, messages. But the testing doc says authenticated employer job APIs/import need a successful live retest and Firecrawl-backed import has env dependencies.

Employer value is powerful only when paired with verified candidate readiness. The next sprint should make one employer demo path trustworthy, not perfect every employer workflow.

**Product implication:** stabilize one credible employer hiring flow after member/counselor/outcomes proof is shippable.

---

## 2) Critical gaps blocking growth

### Gap A: The demo path is still fragile at trust moments

Known issues:

- `/apply/confirmation` pushes create-account CTAs even for authenticated users.
- Email verification can interrupt a live demo unless a pre-created demo account is used.
- The first member confirmation email is functional but not yet a strong trust moment.
- Employer import/API live verification previously failed and should not be claimed as passing.

**Why it blocks growth:** if the fresh applicant path stumbles in a funder, partner, or employer conversation, the broader platform story becomes harder to believe.

### Gap B: Engagement is present, but not yet an operating system

Known gaps:

- `next_step_click` / `action_id` instrumentation is still a follow-up.
- Weekly recap email helper exists, but the scheduled member recap cron is not deployed.
- Counselor work queue for "needs reply in 48h" / stuck members is still a recommended next bet.
- Coursera drop detection and stale learner re-engagement are queued.

**Why it blocks growth:** dashboards are only useful if they change behavior. WorkforceAP needs to prove it can move members from "enrolled" to "active this week" to "completed" to "placed."

### Gap C: Outcomes are visible, but not yet operationally audit-ready

Current strengths:

- `/admin/outcomes` exists as the truth-set.
- snapshot download exists.
- small-sample suppression is handled honestly.

Remaining gaps:

- cohort/program exports that partners and funders can use without custom explanation
- certification verification feed from Coursera completions
- placement claims cross-checked against training completion
- clean tracking of member actions that drive the funnel

**Why it blocks growth:** the sales story depends on defensible proof. The platform should make the outcome report, not require humans to assemble it.

### Gap D: Multi-tenant licensing is not safe enough to push hard

The repo has serious groundwork: `Organization`, `customDomain`, branding fields, tenant docs, `withTenantScope`, and custom-domain resolution notes. But current docs still identify the core risk:

- many read paths assume single tenant
- endpoint-by-endpoint tenant scoping migration remains incomplete
- CI isolation coverage is not broad enough
- emails, nav/footer logos, PDFs, and metadata still contain WorkforceAP hardcoding in places

**Why it blocks growth:** AAUL/NPower/Goodwill-style licensing requires a confident answer to "can another org see my data?" and "will my members receive correctly branded communications?"

### Gap E: Release confidence is lagging product breadth

The app has hundreds of routes and many role-specific workflows. Existing docs repeatedly call out preview-first QA, manual role smoke tests, and thin CI.

**Why it blocks growth:** the product already looks enterprise-sized. Without a tighter QA lane, every new feature increases demo and deployment risk.

---

## 3) Recommended 2-week sprint goals with sequencing

### Sprint north star

Ship a defensible "Austin proof loop" demo:

1. applicant enters
2. member sees and completes the right next action
3. counselor/admin sees who needs attention
4. training progress is verified
5. partner/funder/employer can see an outcome artifact

### Sequence 1: Lock the applicant-to-member trust path

**Goal:** a live demo can move from public site to member dashboard without awkward dead ends.

Ship:

- Fix `/apply/confirmation` so authenticated users see "Open your dashboard" instead of account-creation CTAs.
- Add a lightweight demo-mode checklist doc or admin note for pre-created applicant/counselor accounts.
- Improve the first application confirmation email copy with mission-forward, Dad-voice trust language while keeping promises operationally safe.
- Add one smoke test or scripted QA checklist for: `/apply` -> `/apply/create-account` -> dashboard-or-email-verification state -> admin application visibility.

Acceptance criteria:

- A fresh applicant path can be rehearsed without relying on memory or workarounds.
- Authenticated users do not see contradictory apply-confirmation CTAs.
- The first email feels like WorkforceAP, not a generic SaaS receipt.

### Sequence 2: Turn member next steps into measurable activation

**Goal:** the dashboard becomes an activation engine, not just a portal homepage.

Ship:

- Instrument `next_step_click` with `action_id`, route, member id, and source card.
- Add a small admin/member analytics view or export for weekly active members completing one meaningful action.
- Wire the weekly recap email cron using existing recap generation and `sendWeeklyRecapEmail`.
- Log recap email sent/open/click events into the existing member/email event tables where available.

Acceptance criteria:

- For any member, staff can answer: "what was their recommended next action, did they click it, and did they come back this week?"
- Weekly recap can be generated and sent on schedule in a test run.
- No new AI feature is required to create this engagement loop.

### Sequence 3: Give counselors a real "unstick members" queue

**Goal:** counselors should start their day from a prioritized list, not by hunting across member pages.

Ship:

- Counselor queue for:
  - member message awaiting response beyond SLA
  - enrolled member with no meaningful action in the last 7 days
  - Coursera learner with progress started but stale
  - application approved but no program/training start
- Deep links from each queue item to the exact action page: message thread, member detail, training view, or application.
- Basic status controls: mark reviewed / snooze / message member.

Acceptance criteria:

- A counselor can identify the top 10 members needing attention in one screen.
- Each row explains why the member is there.
- Queue logic reuses existing messages, member events, applications, and Coursera progress where possible.

### Sequence 4: Make outcomes exportable and verifiable

**Goal:** turn the `/admin/outcomes` truth-set into buyer/partner collateral.

Ship:

- Cohort/program export from admin outcomes or programs:
  - applications
  - enrollments
  - training status
  - certifications
  - placements
  - wage/salary fields where present
  - data-quality flags
- Coursera completion-to-certification sync for verified completions, with provenance recorded.
- Placement cross-check: flag placements where verified training/certification is missing or inconsistent.
- Partner-facing export path for referred members and their milestones/outcomes.

Acceptance criteria:

- Mike/Dad can download a funder-safe outcome artifact without asking engineering for a custom query.
- Certification and placement claims have provenance or a visible data-quality warning.
- Partner referral ROI is visible by partner, not just platform-wide.

### Sequence 5: Harden one employer proof path

**Goal:** demonstrate employer demand without trying to finish every employer feature.

Ship:

- Re-run authenticated employer job APIs with a valid employer session.
- Fix whatever blocks `POST /api/employer/jobs`, `/import`, and `/import-bulk` from passing.
- If Firecrawl env keys are unavailable, make the UI state explicit: manual job creation works; ATS import requires configured Firecrawl/Groq keys.
- Create a clean employer demo path:
  - create/post job
  - view candidates/matches
  - move one candidate/application through pipeline
  - message or action next step

Acceptance criteria:

- The testing doc can be updated from "last run failed" to a specific pass/fail result with evidence.
- Employer demo uses one real workflow, not a tour of unfinished surfaces.

### Sequence 6: Minimum licensing trust lane

**Goal:** make AAUL-style licensing believable without overbuilding white-label.

Ship only the trust-critical pieces:

- Expand `withTenantScope` migration to the highest-risk admin, partner, employer, and member list endpoints.
- Make the tenant isolation audit script report a visible burndown and fail on newly introduced unscoped tenant reads.
- Add or expand CI coverage for two-org fixture isolation on the migrated endpoints.
- Parameterize email branding for the highest-volume member/partner/employer emails:
  - application confirmation
  - counselor assigned
  - invite
  - weekly recap
  - partner digest
- Use org logo/name in nav/footer only where request org context is already safe.

Acceptance criteria:

- A buyer can be told exactly which surfaces are tenant-safe now and which are still single-tenant.
- The app does not send AAUL-branded members a WorkforceAP-branded critical email in the core flow.
- No public claim of full white-label readiness is made until endpoint isolation coverage is materially broader.

---

## 4) What NOT to work on yet and why

### Do not build more standalone AI tools

The AI tools backlog is complete enough. More tools will not unblock growth. The bottleneck is whether members use the right tool at the right time and whether counselors/employers/funders can see the resulting progress.

**Exception:** small AI improvements that directly support the counselor queue, recap, or outcome proof loop.

### Do not prioritize the AI support bot yet

An ElevenLabs support bot is on-brand, but it is not the next growth blocker. A generic support bot cannot compensate for unclear demo paths, missing activation metrics, or incomplete outcome exports.

Work on it after the member/counselor/outcomes loop is measurable.

### Do not launch office hours or expand the mentor portal yet

Mentorship and office hours are good ideas, but they add scheduling, reminders, attendance tracking, no-shows, and operational load. The existing counselor loop is not yet tight enough. Adding another human-service surface before the queue/recap/outcome loop is working will create more coordination debt.

### Do not ship Coursera auto-invite-on-join yet

The doc is right to defer it. It touches FERPA/consent, decline mechanics, tenant-scoped branding, invite caps, and legal review. Manual reconcile should be proven in real operations before automation emails learners who have not opted into WorkforceAP.

### Do not start SAML/SCIM yet

Deep links are acceptable for v1 unless they break in practice. SCIM/SAML becomes valuable after the Coursera learner flow is repeatedly used and the current friction is measured. It is not the next sprint's bottleneck.

### Do not do a full portal redesign

The portal surface area is too large. A broad redesign risks breaking auth-protected workflows and slowing the proof loop. Limit UI work to the routes that appear in the applicant, counselor, outcomes, partner, and employer demo paths.

### Do not overbuild white-label aesthetics before isolation

Custom logos, metadata, PDFs, favicon, and theme polish matter, but tenant isolation matters more. The expansion sale is lost faster by a data-boundary concern than by a hardcoded logo in a secondary PDF.

Ship minimum critical branding for core emails/nav only after request org context is safe.

### Do not make public status/SLO claims ahead of real instrumentation

The SLO doc is strong, but the `/api/health/slo` implementation is still described as stubbed in places. Do not publish a buyer-facing status page until the underlying SLO numbers are real enough to defend.

### Do not spend the sprint on blog/content volume

Thought leadership helps later. Right now, proof artifacts sell better than posts: outcome exports, partner milestones, employer workflow evidence, and a clean applicant demo.

---

## Decisive sprint priority order

1. **Applicant trust path** - remove demo-breaking friction.
2. **Member activation instrumentation + weekly recap** - make engagement measurable.
3. **Counselor stuck-member queue** - make staff action operational.
4. **Outcomes export + Coursera verification** - create funder/partner proof.
5. **Employer proof path retest/fix** - show demand-side credibility.
6. **Tenant isolation + critical branded emails** - prepare licensing without overclaiming.

If scope gets tight, cut from the bottom up. Do not cut the applicant path, activation tracking, counselor queue, or outcomes proof. Those are the growth engine.
