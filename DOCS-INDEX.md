# Documentation Index

The single map of every authoritative WorkforceAP doc. Updated 2026-05-07.

If you need the *current* state of something, start here.
For historical / superseded docs, see [`docs/archive/`](./docs/archive/).

---

## Operational (you probably want these first)

| Doc | What it covers |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | How agents (Cursor / Claude Code) should work in this repo — project structure, build commands, Stitch MCP usage. |
| [`DEPLOY.md`](./DEPLOY.md) | Deployment instructions for self-hosting and Vercel. |
| [`ENV-VARIABLES.md`](./ENV-VARIABLES.md) | Every env var the platform reads, with required/optional and source. |
| [`LAUNCH-RUNBOOK.md`](./LAUNCH-RUNBOOK.md) | Pre-launch and launch-day checklist. |
| [`EMAIL-SETUP.md`](./EMAIL-SETUP.md) | Resend configuration, branded layout, deliverability. |
| [`DEMO_SETUP.md`](./DEMO_SETUP.md) | Local demo environment setup. |

## Strategy & vision

| Doc | What it covers |
|---|---|
| [`docs/workforceap-product-vision.md`](./docs/workforceap-product-vision.md) | Confidential product vision (future-state). |
| [`CEO-ANALYSIS-3-7-10-STAR.md`](./CEO-ANALYSIS-3-7-10-STAR.md) | CEO 3-star/7-star/10-star analysis — strategic frame. |
| [`docs/PRODUCT_STAKES.md`](./docs/PRODUCT_STAKES.md) | Locked / approval-required / flexible decisions. **Read before changing public surfaces.** |
| [`docs/DAILY-OPERATING-PLAN.md`](./docs/DAILY-OPERATING-PLAN.md) | Lane-based daily operating rhythm (site / materials / ads / testing / CRM). |

## Live, defensible truth

| Doc | What it covers |
|---|---|
| [`docs/OUTCOMES-METHODOLOGY.md`](./docs/OUTCOMES-METHODOLOGY.md) | Every metric on `/admin/outcomes` with its Prisma source. **Single source of truth for any external pitch.** |
| [`docs/SECURITY-AND-HEALTH.md`](./docs/SECURITY-AND-HEALTH.md) | CSP posture, `/api/health` schema, security backlog. **The single answer to IT due diligence.** |
| [`docs/MISSING.md`](./docs/MISSING.md) | Notification audit — what's wired, what's outstanding, with priorities. |
| [`docs/DEMO-PATH-AUDIT.md`](./docs/DEMO-PATH-AUDIT.md) | Pre-demo checklist + friction findings for the live applicant flow. |

## System & domain

| Doc | What it covers |
|---|---|
| [`docs/FULL-SITE-FEATURE-REFERENCE.md`](./docs/FULL-SITE-FEATURE-REFERENCE.md) | Complete map of the public site, portals, admin system, API domains, integrations, data model, and current shipped features. |
| [`SYSTEM-DOCUMENTATION.md`](./SYSTEM-DOCUMENTATION.md) | High-level system architecture. |
| [`docs/dashboard-handbook.md`](./docs/dashboard-handbook.md) | Dashboard guide for leadership / stakeholders (future-state framing). |
| [`USER-GUIDE.md`](./USER-GUIDE.md) | End-user guide. |
| [`docs/coursera-go-live-runbook.md`](./docs/coursera-go-live-runbook.md) | Coursera production readiness checklist. |
| [`docs/coursera-xapi-setup.md`](./docs/coursera-xapi-setup.md) | xAPI integration setup. |
| [`docs/coursera-prep.md`](./docs/coursera-prep.md) | Pre-Coursera-launch tasks. |
| [`docs/SUPABASE-STORAGE-SETUP.md`](./docs/SUPABASE-STORAGE-SETUP.md) | Supabase Storage buckets and policies. |
| [`docs/design-system.md`](./docs/design-system.md) | Design tokens, color palette, type. |
| [`docs/SaaS-ONBOARDING.md`](./docs/SaaS-ONBOARDING.md) | Multi-tenant SaaS onboarding flow. |

## Engineering process

| Doc | What it covers |
|---|---|
| [`docs/AGENT_CHANGE_GUARDRAILS.md`](./docs/AGENT_CHANGE_GUARDRAILS.md) | Rules for agents touching the codebase. |
| [`docs/BACKLOG-MAINTENANCE.md`](./docs/BACKLOG-MAINTENANCE.md) | How backlog files are kept clean. |
| [`docs/COMPLETED-WORK-LOG.md`](./docs/COMPLETED-WORK-LOG.md) | Append-only log of shipped tasks. |
| [`docs/TESTING-STATUS.md`](./docs/TESTING-STATUS.md) | Current test coverage and known gaps. |
| [`AI-TOOLS-BACKLOG.md`](./AI-TOOLS-BACKLOG.md) | Status of the AI tools surface. |
| [`TODOS.md`](./TODOS.md) | Active design/UX debt. |
| [`WORKING.md`](./WORKING.md) | Current migration caveats and temporary working notes. |
| [`DESIGN.md`](./DESIGN.md) | Design notes. |
| [`ENG_REVIEW_i18n.md`](./ENG_REVIEW_i18n.md) | i18n engineering review. |

## Audits (current cycle)

| Doc | What it covers |
|---|---|
| [`docs/LIVE-PORTAL-AUDIT-2026-04-26.md`](./docs/LIVE-PORTAL-AUDIT-2026-04-26.md) | Live portal audit, Apr 2026. |
| [`docs/CROSS-PORTAL-AUDIT-PLAN.md`](./docs/CROSS-PORTAL-AUDIT-PLAN.md) | Cross-portal audit framework. |
| [`docs/PORTAL-UI-UX-AUDIT-FINDINGS.md`](./docs/PORTAL-UI-UX-AUDIT-FINDINGS.md) | UI/UX findings. |
| [`docs/MEMBER-PAGES-AUDIT.md`](./docs/MEMBER-PAGES-AUDIT.md) | Member-facing pages audit. |
| [`docs/CROSS-PORTAL-PAGES-AUDIT.md`](./docs/CROSS-PORTAL-PAGES-AUDIT.md) | Cross-portal pages audit. |
| [`docs/PORTAL-PRE-PR-AUDIT.md`](./docs/PORTAL-PRE-PR-AUDIT.md) | Pre-PR audit checklist. |
| [`NOTIFICATION-AUDIT.md`](./NOTIFICATION-AUDIT.md) | Notification audit (older — see also `docs/MISSING.md`). |

## Verification specs (10-star aspirational)

These describe target state for various surfaces. They're checked against
production via the methodology in `docs/OUTCOMES-METHODOLOGY.md`. Keep in
`docs/` for now; consider archiving once each surface lands.

- `docs/VERIFICATION-HOMEPAGE-10-STAR.md`
- `docs/VERIFICATION-HOMEPAGE-10-STAR-SYSTEM.md`
- `docs/VERIFICATION-PROGRAMS-10-STAR.md`
- `docs/VERIFICATION-PROGRAMS-DECISION-STACK-UNIFIED.md`
- `docs/VERIFICATION-CONVERSION-STACK-10-STAR.md`
- `docs/VERIFICATION-LEADERSHIP-10-STAR.md`
- `docs/VERIFICATION-SALARY-GUIDE-10-STAR.md`
- `docs/VERIFICATION-PARTNER-PORTAL-10-STAR.md`
- `docs/VERIFICATION-STUDENT-DASHBOARD-10-STAR.md`
- `docs/VERIFICATION-PUBLIC-TRUST-REVENUE-10-STAR.md`
- `docs/VERIFICATION-10-STAR-IMPORT.md`

## Archive

For docs that have been superseded — old sprint plans, dated audits, completed
fix briefs — see [`docs/archive/`](./docs/archive/) and its
[`README.md`](./docs/archive/README.md).

---

*Maintained as part of the doc collapse on 2026-05-07. When you add a new
canonical doc, add it here so newcomers can find it.*
