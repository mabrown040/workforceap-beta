# Cursor Prompt — WorkforceAP Backlog Phase 1

Use this as the next implementation prompt.

---

You are working in the WorkforceAP repo.

Repo: `https://github.com/mabrown040/workforceap-beta`
Local path: `C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta`
Base branch: latest `master`

## Branch / PR requirements
- Start from current latest `master`
- Create a **NEW branch** for this work
- Open a **NEW PR**
- Do **not** reuse any old PR
- Do **not** push directly to `master`

## Context
We just finished an office-hours review and a CEO-style product review of the Mar 21, 2026 WorkforceAP call.

Important context:
- This was Mike + his dad + his mom on the call.
- Treat the requested changes from that call as **real approved backlog input**, not casual brainstorming.
- If Mike’s dad requested a content/UX change during the call, treat it as approved direction **unless it would break the protected constraints listed below**.

## Product framing
Build WorkforceAP as a **workforce operating system**, not just a nonprofit website.

The current phase should strengthen:
1. the public front door
2. the programs decision system
3. the highest-trust/highest-value employer workflow

Do not try to build every backlog item in one pass. Ship a disciplined Phase 1 that clearly improves the product.

## Protected constraints
- Do **not** change the homepage hero headline: `"Breaking systemic barriers through education, technology, and opportunity"`
- Do **not** make the site sound like generic nonprofit/agency AI slop
- Preserve Dad’s voice where existing copy already feels strong
- Keep Austin framed as the launch wedge, not the long-term ceiling
- Salary guide must stay credible, elegant, and realistic
- Do not create auth/role regressions
- Do not break existing portal routing/layout behavior

## Copy approval note
These call-requested changes are now approved to implement **where they fit cleanly**, as long as they do not conflict with the protected hero headline above:
- Move `How It Works` before `Programs`
- Clarify/surface partner positioning more clearly
- Improve future-oriented language where appropriate
- Reframe credibility copy to feel more institutional and outcome-driven
- Update program naming/wording for clarity
- Improve public messaging so it better explains the whole system

If a requested wording change would directly conflict with a protected string, keep the protected string and improve the surrounding copy instead.

## Phase 1 goals
Implement a strong first pass across these 4 areas:

### 1) Public website trust + navigation clarity
Improve the front door so it is easier for a first-time visitor to understand what WorkforceAP is, who it serves, and where to go next.

Required changes:
- Reorder public nav so `How It Works` appears before `Programs`
- Confirm/simplify nav structure so it feels intentional and easy to scan
- Surface partner visibility more clearly in nav and/or page CTAs
- Clarify the public distinction between:
  - members/students
  - employers
  - partners
- Replace any obvious placeholder/trust-breaking blog imagery if present in the current codebase
- Tighten page hierarchy/readability where low-effort, high-impact improvements are obvious

Desired outcome:
- The public site feels more credible, clearer, and more product-like
- A parent, partner, or employer can understand the model without guessing

### 2) Programs decision stack improvement
Treat these pages as one connected decision system:
- `/find-your-path`
- `/programs`
- `/programs/[slug]`
- `/program-comparison`
- `/salary-guide`

Required changes:
- Improve fit/readiness guidance so users can better tell which path fits them
- Prioritize `digital literacy` first for users who are uncomfortable with computers, if that logic already exists in the pathfinder/recommendation flow
- Update wording from `health information technology` to `medical coding and health information technology class` where appropriate and not structurally disruptive
- Keep salary framing realistic and not hype-driven
- Strengthen “best for / likely fit / readiness” clarity across the decision stack

Desired outcome:
- The programs experience feels like real guidance, not just a catalog
- The decision system helps users choose confidently

### 3) Employer portal trust + professionalism pass
This is a top business priority. The employer experience must feel like a polished hiring product, not an internal beta admin tool.

Focus areas:
- employer jobs board clarity
- review/import trust cues
- job-match explanation quality
- overall professionalism of the employer experience

Required changes:
- Improve employer-facing hierarchy and clarity on the jobs/import experience
- Keep job posting/import low-friction
- Preserve manual fallback when parsing/import fails
- Preserve draft/review flow before jobs go live
- Preserve admin-review notification behavior if already present
- Rename `Applicants` to `Workforce AP Applicants` where this label appears in employer/admin-facing UX
- Improve explanation quality around suggested program/job matches so they feel more trustworthy and useful
- Remove or reduce technical/internal-feeling copy where employer-facing language should be outcome-focused and professional

Desired outcome:
- An employer could believe this is a serious hiring workflow
- Matching/recommendation UX feels helpful, not gimmicky

### 4) Leadership / trust cleanup (only if low-risk within this pass)
If this can be done cleanly in the same PR without creating bloat, include a light trust/credibility pass:
- Reorder leadership cards so Brandon appears before Derek
- Change Adriane wording from `certification` to `certificate`
- Improve scanability and reduce resume-dump feel
- Keep Mike’s credibility visible, but make the page feel more institution-ready

If this starts to expand too much, keep it narrow and only do the low-risk fixes.

## Implementation guidance
- Read the relevant files before editing
- Make focused, high-leverage changes
- Prefer clarity, hierarchy, and trust over decorative redesign
- Avoid introducing half-finished features
- Preserve working flows while improving presentation and decision support
- If a requested item is too large for this pass, leave a short TODO note in the PR summary instead of forcing a weak implementation

## Verification requirements
Before finishing:
- Run relevant lint/typecheck/tests for touched areas
- Do lightweight manual QA of the changed routes/components
- Verify no regressions in auth/role-sensitive portal behavior
- Verify no protected headline change occurred
- Verify no unrealistic salary/career claims were introduced

## Deliverable requirements
When done:
- Open a **NEW PR**
- Include a concise summary of what changed
- Include verification run/output
- Call out any backlog items intentionally deferred to later phases

## Success criteria
This PR is successful if it produces a clear, visible improvement in these areas:
- public trust + navigation clarity
- program decision support quality
- employer portal professionalism + trust
- light leadership trust cleanup if low-risk

This PR is **not** successful if it becomes a giant unfocused overhaul, introduces regressions, or turns the site into generic vague marketing copy.
