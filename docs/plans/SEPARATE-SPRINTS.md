# Separate engineering sprints

These tracks are **out of scope** for the main product sprint but are planned as **distinct efforts** with their own acceptance criteria and owners. The [2026-04-03 sprint tracker](2026-04-03-sprint-tracker.md) links here for the summary bullets.

## O*NET ↔ 19 programs mapping (Grok)

- **Goal:** Reliable mapping from O*NET occupations and member assessment signals to the 19 WorkforceAP program slugs for recommendations and reporting.
- **Approach:** Keep Grok (or equivalent LLM) in the loop for suggestions; tighten prompts, validation, and human-review hooks in admin (`/admin/career-mappings` and related APIs).
- **Done when:** Mappings are versioned, testable, and auditable for compliance conversations.

## Partner portal white-label

- **Goal:** Partners can deliver WorkforceAP-style experiences (branding, attendance, outcomes) without looking like a generic third-party tool.
- **Approach:** Extend org branding, partner portal surfaces, and export/report paths discussed in partner settings and pipeline work.
- **Done when:** At least one pilot partner can run a cohort with white-label assets and required exports.

## WAP email addresses (@workforceap.org)

- **Goal:** Optional member or staff identities on `@workforceap.org` for trust and deliverability (policy-dependent).
- **Approach:** Integrate with your chosen mail host (Google Workspace, Microsoft 365, etc.); product changes are mainly provisioning hooks and display — **no secrets in the repo**.

## Signup flow audit

- **Goal:** Close gaps from program call notes (e.g. items #16, #18, #19): friction points, consent clarity, and error recovery in apply/signup.
- **Approach:** UX pass on `/apply` and related flows, analytics or event review, and a short prioritized fix list.

---

*Last updated: 2026-04-04.*
