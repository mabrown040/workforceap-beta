# WorkforceAP Cursor Prompt — Phase 2.5 Clarified

Use the latest current `master`.

Create a **NEW branch** and open a **NEW PR**.
Do **not** reuse an old PR.
Do **not** direct-push to `master`.

---

## Why this prompt exists
The previous pass deferred some items too aggressively.

This prompt clarifies what actually belongs in the **next implementation pass** so the work does not stop at surface polish or vague UX cleanup.

This is still a **disciplined Phase 2.5** — not a full platform rewrite — but it should pull forward the right unresolved product issues with clearer execution expectations.

---

## Core objective
Tighten the WorkforceAP experience in two connected areas:

1. **portal-entry and audience-flow clarity**
2. **the public programs decision system**

The site is stronger now, but there are still two structural gaps:

- portal access is still not clean/intuitive enough by audience
- the programs stack still behaves more like a catalog than a true decision system

---

## In scope for this pass

### 1) Public portal-entry clarity
The public experience should make it obvious where each audience goes:
- members / students
- employers
- partners

#### Required outcomes
- Keep `Apply Now` as the primary CTA
- Keep `Member Portal` visible
- Add a clearer public entry point for `Partner Portal`
- Keep employer access easy to find without turning the header into clutter
- Make mobile portal-entry behavior clean, obvious, and professional
- Reduce the feeling of “log in and hope the system figures it out later”

#### Product direction
Separate audience entry points are preferred where appropriate:
- member/student entry
- employer entry
- partner entry

This does **not** require separate auth backends.
Shared auth is fine.
But the **entry paths, copy, redirect logic, and shell expectations** should be clearer by audience.

#### Important clarification
Do not solve this with a generic portal bucket or hidden logic only.
The audience-specific paths need to be visible enough that a real user immediately knows where to go.

---

### 2) Programs decision-system overhaul
Pages in scope:
- `/find-your-path`
- `/programs`
- `/programs/[slug]`
- `/program-comparison`
- `/salary-guide`

#### Required outcomes
- help users narrow to their best 1–3 options faster
- improve best-fit clarity
- improve confidence in choosing a path
- make tradeoffs easier to understand
- strengthen continuity between pages so the stack feels like one decision journey

#### Important clarification
Do not stop at copy tweaks or visual polish.
This work should improve the actual **decision logic and guidance quality**.

---

### 3) `/program-comparison` must become a true comparison tool
This page is currently not a true comparison page.
It behaves more like a reference table than an actual compare-and-decide experience.

#### Required outcomes
Make `/program-comparison` function like a real comparison experience.

That may include:
- letting users select specific programs to compare
- clearer side-by-side structure
- stronger tradeoff framing
- better explanation of key decision criteria
- more explicit "best for" / fit guidance
- much stronger mobile treatment

#### Critical clarification
Do **not** just make the table prettier.
The page should help answer:
- which program is better for me?
- what am I trading off?
- what fits my readiness, timeline, and goals?

A hybrid model is acceptable and likely stronger:
- guided recommendations by default
- optional side-by-side compare mode for selected programs

---

### 4) Bring back the right deferred items with clearer scope
The prior pass deferred too much. For this pass, bring back the following **in lightweight but real form**:

#### A. Low-readiness support inside the existing flow
Do **not** create a dedicated low-readiness route yet.
But do improve in-flow support where it already belongs.

Required:
- clearer messaging for lower-readiness users during the existing decision/application flow
- supportive next-step language instead of dead-end energy
- clear links to the right basic/foundational resources where relevant
- preserve dignity and momentum; do not make the user feel screened out

This should stay inside existing flows/pages.
No major route expansion needed.

#### B. Stronger partner usefulness signals
Do **not** build the full exports / subgroup-reporting system yet.
But do improve the partner-facing product enough that it feels less deferred and more intentional if touched in this pass.

Only include if naturally connected to the in-scope work above.
Keep it light.
Do not let this take over the PR.

#### C. Light admin/super-admin clarity if needed to support audience separation
Do **not** build full context banners or advanced super-admin switching.
But if small label / role / shell clarifications are necessary to keep the audience-flow work coherent and avoid confusing role leakage, include the minimal version needed.

#### D. Apply-flow branching remains mostly out
Do **not** build a full branching apply flow based on assessment score.
Keep the existing funding-qualifies handling.
You may improve guidance language and in-flow support, but do not turn this PR into a full branching application-engine rewrite.

---

## What stays out
Still **out of scope** for this pass unless a tiny supporting change is absolutely necessary:
- dedicated low-readiness route
- deep partner exports / subgroup reporting / analytics system
- rich admin context banners
- advanced super-admin switching beyond what is minimally necessary
- full branching apply flow by score/outcome

Keep the PR disciplined.

---

## Decision-system continuity requirements
These pages should feel connected, not isolated:
- `/find-your-path` should flow naturally into recommended programs
- `/programs` should help users browse with stronger fit context
- `/programs/[slug]` should help the user compare that program against alternatives
- `/program-comparison` should support real side-by-side choice
- `/salary-guide` should support decision-making without reducing the whole system to salary hype

---

## Constraints
- preserve Dad’s voice
- avoid generic nonprofit slop
- keep protected homepage copy unchanged
- do not change the protected hero headline
- do not change `"$0 Cost to Qualifying Participants"`
- keep Austin framed as the launch wedge, not the long-term ceiling
- mobile quality matters, especially under `<640px`
- no auth regressions
- no role-scoping regressions
- no portal routing regressions

---

## What “good” looks like after this PR

### Portal clarity
- a partner can immediately tell where to go
- an employer can immediately tell where to go
- a member can immediately tell where to go
- mobile nav feels cleaner and more intentional

### Programs decision system
- users can move from interest → fit → comparison → confidence → action
- `/program-comparison` actually behaves like a comparison tool
- the programs stack feels like one decision journey instead of disconnected pages

### Deferred items handled correctly
- low-readiness users receive better in-flow support without a whole new route
- small admin/role clarity issues do not undermine the cleaner audience flows
- no giant side quests

---

## Deliverable
Open a **NEW PR** with:
- concise summary of what changed
- screenshots for desktop + mobile
- short explanation of how `/program-comparison` now works as a real comparison/decision tool
- note any route, navigation, or information-architecture changes clearly
- clearly list which previously deferred items were intentionally brought back in lightweight form

---

## Final instruction
Do not optimize for a "looks nicer" PR.
Optimize for a PR that makes WorkforceAP feel more intentional, easier to navigate by audience, and materially better at helping a user choose the right program.
