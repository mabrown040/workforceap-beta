# Cursor Prompt — WorkforceAP Phase 2

Use this as the next implementation prompt after PR `#140` / commit range through `33d92f5`.

---

You are working in the WorkforceAP repo.

Repo: `https://github.com/mabrown040/workforceap-beta`
Local path: `C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta`
Base branch: latest `master`
Current merged reference point: `33d92f5` (PR `#140`)

## Branch / PR requirements
- Start from current latest `master`
- Create a **NEW branch** for this work
- Open a **NEW PR**
- Do **not** reuse any old PR
- Do **not** push directly to `master`

## Context
Phase 1 already landed in PR `#140`.
That pass covered a meaningful portion of the public trust / programs / employer polish layer.

Do **not** redo Phase 1.
Build Phase 2 around the highest-value remaining operating-system gaps.

Treat the Mar 21, 2026 call requests from Mike + his dad + his mom as real approved backlog direction unless they conflict with the protected constraints below.

## What Phase 1 already addressed
Preserve these improvements unless there is a clear bug:
- public nav cleanup (`How It Works` before `Programs`)
- homepage audience framing
- footer discoverability links
- pathfinder digital-literacy-first behavior for low tech comfort
- clearer MCHIT naming
- better fit/readiness guidance in the public programs stack
- calmer employer-facing match/applicant language
- leadership trust cleanup (Brandon before Derek, Adriane certificate wording)

## Protected constraints
- Do **not** change the homepage hero headline: `"Breaking systemic barriers through education, technology, and opportunity"`
- Do **not** change `"$0 Cost to Qualifying Participants"` without explicit product approval
- Do **not** introduce generic nonprofit/agency AI-slop copy
- Preserve Dad’s voice where existing copy is already strong
- Keep Austin framed as the launch wedge, not the long-term ceiling
- Do not create auth/role regressions
- Do not break portal routing/layout behavior
- Keep salary/outcome framing realistic and credible

## Phase 2 objective
Build the deeper operating-system layer that sits behind the improved front door.

This phase should focus on 5 areas:
1. low-readiness applicant support
2. member portal usefulness / weekly value
3. partner portal accountability value
4. public nav / portal-entry clarity
5. super-admin/internal operating clarity

Keep the scope disciplined. This should feel like a coherent Phase 2, not a giant catch-all rewrite.

---

## 1) Apply flow + low-readiness support path

### Why this matters
Applicants who are not yet ready should not hit a dead end. WorkforceAP should convert more borderline users into future-ready members instead of losing them.

### Required changes
- Re-review the post-assessment/apply flow for users who score low or show low readiness
- Add a clear supportive path for lower-readiness users instead of a vague dead-end outcome
- Build a simple support destination/page/state for users who need foundational help
- Add clear next-step messaging that explains:
  - what their result means
  - what they should do next
  - how WorkforceAP can still help them progress
- Where appropriate, reinforce foundational readiness areas such as digital literacy / basics support

### Desired outcome
- Low-readiness users still feel supported
- The application flow feels humane and practical
- WorkforceAP captures more future-ready members instead of losing them immediately

---

## 2) Member portal: make it useful every week

### Why this matters
The member portal cannot just be a one-time onboarding destination. It needs ongoing weekly value.

### Required changes
Improve the member portal so it more clearly emphasizes:
- next best action
- progress visibility
- training/course progress
- useful career-tool outputs
- recaps / reminders / momentum

Specific directions:
- Keep the portal streamlined and action-oriented
- Improve hierarchy so the most important action is obvious
- Make AI/career tools feel practical, not gimmicky
- Improve the visibility/clarity of progress-related signals if they already exist in the codebase
- If resume/cover-letter/career outputs already exist, improve polish and presentation rather than inventing random new tools

### Desired outcome
- A member logging in weekly knows exactly what to do next
- The portal feels like an active support system, not a collection of disconnected widgets

---

## 3) Partner portal + accountability reporting

### Why this matters
This is one of the clearest long-term monetization and platform-differentiation layers.

### Required changes
Strengthen the partner side so it feels like an accountability product, not a passive dashboard.

Focus areas:
- consistent naming (`Member Portal`, `Partner Portal`, `Employer Portal`)
- clearer assigned-member visibility
- progress/outcome visibility
- cohort/subgroup usefulness where already structurally possible
- partner-value framing around outcomes, not just access

Implementation goals:
- Let partners more clearly understand who they referred and what is happening with those people
- Improve visibility into status/progress/completions/placements where current data structure allows
- Tighten hierarchy and wording so the portal reads as a serious partner tool

### Desired outcome
- A partner can tell whether WorkforceAP is actually delivering outcomes for their people
- The portal supports renewal/retention/value conversations better

---

## 4) Public nav / portal-entry clarity

### Why this matters
Right now, partner and employer entry points are too hidden. That creates nav hygiene problems and makes the platform feel less complete than it is.

### Required changes
- Add a clearer public entry point for the Partner Portal
- Keep portal entry options understandable at a glance on desktop and mobile
- Reduce ambiguity between public audience pages and actual portal/login entry points
- Make sure partner and employer access does not feel buried behind member-first navigation
- Keep nav hierarchy clean and professional rather than turning the header into a cluttered link dump

### UX direction
Use the cleanest version that preserves trust and scanability:
- `Apply Now` remains the main CTA
- `Member Portal` can remain a direct top-level item
- Add a distinct `Partner Portal` entry or a clean grouped `Portal Login` pattern **only if it stays clearer than separate cluttered buttons**
- Employer entry should remain easy to find from nav and/or employer page CTA
- On mobile, portal entry must be obvious, tap-friendly, and not require hunting through awkward nested menus

### Mobile / professionalism requirements
- Keep tap targets at least 44px
- Avoid overcrowding the header or mobile menu
- Make the mobile menu feel intentional and premium, not like a long admin list
- Keep portal actions grouped in a way that reads clearly for non-technical users

### Desired outcome
- A partner can immediately find how to log in
- An employer can immediately find where to go
- The nav feels cleaner, more intentional, and more professional on both desktop and mobile

---

## 5) Super-admin / internal operating clarity

### Why this matters
The system now spans multiple stakeholder experiences. Internal control needs to stay clear and safe.

### Required changes
- Preserve and clarify the distinction between admin and super admin
- Improve super-admin context switching/view switching if needed for clarity/usability
- Reduce confusing portal-context leakage or ambiguity
- Keep internal management actions safe and understandable
- If Adriane Brown / Michael Brown super-admin assumptions are represented in code or seed logic, preserve/support that direction safely without introducing auth regressions

### Desired outcome
- Internal operators can move between contexts with less confusion
- Role boundaries remain clear
- The system feels more operationally mature

---

## Implementation guidance
- Read relevant files before editing
- Build from actual existing flows/components/data, not fantasy features
- Prefer stronger hierarchy, clearer messaging, and better operational UX over decorative redesign
- If a requested item is too large for this phase, leave it deferred in the PR summary instead of forcing a weak partial implementation
- Keep changes coherent across member / partner / admin experiences

## Verification requirements
Before finishing:
- Run relevant lint/typecheck/tests for touched areas
- Manually QA the changed user flows
- Verify no regressions in auth/role-sensitive behavior
- Verify protected homepage strings remain unchanged
- Verify partner/admin/member views still route correctly

## Deliverable requirements
When done:
- Open a **NEW PR**
- Include concise summary of what changed
- Include verification output
- Include a short section: `Deferred from Phase 2` for anything intentionally pushed later

## Success criteria
This PR is successful if it visibly improves:
- support for lower-readiness applicants
- ongoing usefulness of the member portal
- partner accountability/reporting clarity
- super-admin/internal operational clarity

This PR is **not** successful if it:
- redoes Phase 1 work
- turns into a giant redesign
- introduces auth/role regressions
- adds vague marketing copy instead of usable product improvements
