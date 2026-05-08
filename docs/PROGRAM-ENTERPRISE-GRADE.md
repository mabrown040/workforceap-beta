# WorkforceAP — Path to Enterprise Grade

**Started:** 2026-05-08
**Status:** Track A Sprint 1 in flight (this PR)
**Owner:** Mike + autonomous tracks orchestrated by Claude

> *"What separates a working platform from a multi-million-dollar-grade investable platform?"*

This doc is the **single source of truth** for that question. It captures the 5-track program, the gates each track has to clear, and the running status of each.

If you're a new agent, read this first before starting any enterprise-grade work.

---

## The 6 questions enterprise buyers ask

A workforce board's procurement officer, a corporate co-funder's IT director, or a VC doing diligence will ask **six questions** before signing.

| # | Question | Track |
|---|---|---|
| 1 | *"If I'm AAUL, can NPower's admin see my members?"* | **A — Tenant Isolation** |
| 2 | *"How do partners push referrals programmatically?"* | **B — Partner API** |
| 3 | *"How do I trust your placement numbers? Can the member verify? Can the employer?"* | **C — Outcome Verification** |
| 4 | *"What's your uptime story? Incident response?"* | **D — SLOs + Observability** |
| 5 | *"Can you white-label for our brand and our domain?"* | **E — Multi-tenant UI** |
| 6 | *"What's your SOC 2 / FERPA story?"* | **F — Compliance pack** |

Today the answers are 0/6 fully shippable. With this 8-sprint program, all 6 become defensible. That's the multi-million-dollar-grade transition.

---

## The 5 tracks

### Track A — **Tenant Isolation Hardening** (3 sprints) [IN PROGRESS]

The single most important track because every other track assumes tenant boundaries hold. Today the schema has `organization_id` on every tenant-scoped table, but enforcement is *convention*, not *contract*. Every Prisma query has to remember to add `where: { organizationId: ... }`. One missed filter = a cross-tenant data leak = enterprise sale killer.

**Sprint A.1 — Foundation [THIS PR]**
- ✅ Audit script: inventory of every tenant-scoped Prisma read, mark which already filter and which don't
- ✅ `withTenantScope(orgId, fn)` helper — gives an enforced tenant context that fails loudly if a tenant-scoped query escapes
- ✅ CI test fixture — seeds two orgs, fires representative endpoints, asserts no cross-tenant leak
- ✅ One reference endpoint migration — `app/api/admin/jobs/route.ts` adopts the pattern
- ✅ Architecture doc: `docs/TENANT-ISOLATION.md`

**Burndown after Sprint A.1:** 458 tenant-scoped Prisma call sites, 1 scoped (the reference migration), 457 unscoped. The earlier "21 scoped" report was a false-positive: `getDefaultOrganizationId()` was treated as a scope marker, but it's just a value lookup — a Codex review caught it. The 457 number is the honest migration burndown.

**Sprint A.2 — Migration**
- Migrate the remaining ~30 admin and partner endpoints to use `withTenantScope`
- Each migration is a small focused PR with the CI isolation test running per endpoint

**Sprint A.3 — RLS belt-and-braces + pen audit**
- Postgres Row-Level Security policies on every tenant-scoped table — backstop in case app-layer scoping drifts
- `setTenantContext(orgId)` Prisma extension that runs `SET LOCAL app.current_org_id` at transaction start
- Manual penetration audit: every admin API tried as Org A, attempt every tenant escape vector
- Signed-off doc Mike walks into TWC / corporate IT with

**Track A success criteria:** *"We run RLS + app-layer scoping + CI tests per endpoint. Here's the test that fails CI on a regression. Here's the audit."*

---

### Track B — **Partner API + Token Management** (2 sprints)

**Why it matters:** Once you license to AAUL, NPower, Goodwill, they want to push 50 referrals from their case-management system into WorkforceAP via API. Today the only path is CSV upload. That's a gating issue for the licensing revenue tier.

**Sprint B.1 — Token + read endpoints**
- `partner_api_tokens` table (per `Partner`) — generated in admin, rotatable, scoped to actions, expires
- `GET /api/v1/partners/me/members` — read-only on assigned members
- `GET /api/v1/partners/me/outcomes` — placement aggregates for their referrals
- OpenAPI spec at `/api/v1/openapi.json` + `/docs` Swagger UI
- Per-token rate limiting (Redis already in use)
- Token-level audit log

**Sprint B.2 — Write endpoints + integration guide**
- `POST /api/v1/partners/me/referrals` — push a member referral
- `POST /api/v1/partners/me/milestone-callbacks` — partner pushes back milestone events from their own systems
- Postman collection
- Partner integration guide PDF Dad can hand to AAUL's IT team

**Track B success criteria:** *"AAUL's IT engineer can integrate in a day with our docs."*

---

### Track C — **Outcome Verification Pipeline** (2 sprints)

**Why it matters:** `/admin/outcomes` is honest about what's in the database, but the *quality* of placement data depends on whoever entered it. A funder paying per placement will eventually ask: *"prove this person is actually employed."* Make that proof structural, not testimonial.

**Sprint C.1 — Member self-verification**
- Cron at day 30/60/90 emails the member with a one-click "Yes I'm still working" / "Lost the job" widget
- Each click writes a `PlacementVerification` row with timestamp + signed token
- `/admin/outcomes` upgrades: "verified" vs "self-reported" placements; retention rates with confidence intervals

**Sprint C.2 — Employer + partner verification**
- At offer-acceptance time, employer signs a tokenized link confirming hire date + start date — stored as cryptographic provenance
- Partner dispute workflow: partners can flag a placement they suspect is fake; raises an audit ticket
- Provenance metadata on every `PlacementRecord`: who entered, who verified, what evidence exists, last refreshed

**Track C success criteria:** *"Of 47 placements, 41 are member-confirmed at 30+ days, 38 are employer-confirmed, 0 are disputed."*

---

### Track D — **SLOs + Observability** (1 sprint)

**Why it matters:** "What's your uptime?" is the third question every IT director asks. Today the answer is "Vercel says we're up." Not enough.

**Single sprint — define + instrument + publicize:**
- **Defined SLOs**: 99.9% uptime, p95 dashboard render < 500ms, 0 cross-tenant leaks (auto-detected via synthetic transaction), email delivery > 99% in 5 min
- Public status page at `status.workforceap.org` — real-time, auto-updating
- Sentry alerting — burn-rate alerts on each SLO, paged to Mike/Dad
- Synthetic monitor — every 5 min hits the apply-funnel happy path
- Quarterly SLO report auto-generated from Sentry + Vercel telemetry

**Track D success criteria:** *"Status page Dad can link to in his pitch deck."*

---

### Track E — **White-Label Multi-Tenant UI** (1 sprint, parallel to A–D)

**Why it matters:** The licensing tier of revenue (`aaul.workforceap.org`) requires real white-label. Schema has `Organization.customDomain`, `primaryColor`, `logo` — but does the entire portal actually use those values everywhere?

**Single sprint — audit + complete:**
- Custom domain → org resolution working end-to-end (middleware reads `Host`, looks up `Organization`, sets request context)
- Theme variables flowing from `Organization.primaryColor` through CSS vars
- Email templates rendered with org branding (logo, accent color, footer text)
- Org-scoped admin (relies on Track A's RLS)

**Track E success criteria:** *"Second org seeded as `aaul.workforceap.org` with AAUL's branding demonstrates the licensing tier works."*

---

### Track F — **Compliance Pack** (deferred — last 2-3 sprints)

**SOC 2 + FERPA-adjacent + WIOA reporting hardening.**

Specifics depend on which audit Mike pursues first. Likely scope:
- Access control review: admin role audit, MFA enforcement
- Encryption at rest + in transit (Supabase mostly does it)
- Backup + restore tested
- Incident response runbook
- Vendor management doc
- Change management (CI/CD with approvals)

**Track F is gated on which buyer Mike commits to first.** Defer until then.

---

## Sequencing (8 sprints, ~2 months)

```
Sprint 1-2:    Track A.1-A.2 (foundation + migration)              [E.1 in parallel]
Sprint 3:      Track A.3 (RLS + audit) + start B.1
Sprint 4:      Track B.1-B.2 (Partner API)                         [D in parallel]
Sprint 5-6:    Track C.1-C.2 (verification pipeline)
Sprint 7:      Track E.2 (multi-tenant polish)
Sprint 8:      Track F (compliance evidence collection)
```

---

## Working principles

1. **One PR per sprint slice.** Don't pile multiple sprints into one mega-PR.
2. **Every track has a CI test that fails on regression.** Tracks without that aren't done.
3. **Every track ships a doc the buyer can read.** Code without an explainer doesn't sell the platform.
4. **Each PR can be merged independently.** No long-lived feature branches.
5. **Drag the user along.** Update this doc with status. Mike should know which sprint we're in at a glance.

---

## Status board

| Track | Status | PRs | Notes |
|---|---|---|---|
| A.1 — Tenant isolation foundation | ✅ Landed | #1041 | `withTenantScope` + audit script + 35 unit tests + 1 reference migration |
| A.2 — Migration | 🟢 In flight | #1042, #1044, #1047, #1049, #1051 | 5 batches landed; **458 → ~378 unscoped (~17% migrated)** |
| A.3 — RLS + pen audit | ⚪ Queued | — | Strategic gate. Helpers in place: `getActorOrganizationId`, `getSubjectOrganizationId`, `isAdminInOrg`, `assertSameTenant` |
| B.1 — Partner API tokens + read | ⚪ Queued | — | After A.3 |
| B.2 — Partner API writes | ⚪ Queued | — | After B.1 |
| C.1 — Member verification | ⚪ Queued | — | After B.2 |
| C.2 — Employer + partner verification | ⚪ Queued | — | After C.1 |
| D.1 — SLO foundation | ✅ Landed | #1043 | 6 SLOs + admin-gated `/api/health/slo` stub + status-page strategy doc |
| D.2 — SLI wiring | ⚪ Queued | — | Wire real Sentry / Vercel / DB queries into D.1 stub |
| D.3 — Public status page | ⚪ Queued | — | Gated on Track A.3 synthetic isolation probe (SLO #5) |
| E audit — White-label readiness | ✅ Landed | #1045 | 5-PR roadmap, schema 80% ready, middleware was 0% |
| E.1 PR 1 — Custom domain middleware | ✅ Landed | #1046 | Edge-safe Host → Org resolver, in-process 60s cache, header strip + tenant-aware admin check |
| E.1 PR 2 — Email branding | ✅ Landed | #1052 | `getOrganizationBranding` helper + 5 templates parameterized; ~30 templates remain |
| E.1 PR 3 — Nav / footer logo awareness | ⚪ Queued | — | |
| E.1 PR 4 — Per-org metadata | ⚪ Queued | — | |
| E.1 PR 5 — PDF export logo awareness | ⚪ Queued | — | |
| E.2 — Multi-tenant UI complete | ⚪ Queued | — | After A.3 + E.1 batch ships |
| F — Compliance pack | ⚪ Deferred | — | Until buyer commits |

### Side hustles (not in the original 5-track plan but landed alongside)
- Sentry browser-translate fix — admin tree opt-out (#1038)
- DataTable + SectionHeader + form primitives + 4 page migrations (#1040, #1048)
- Coursera admin page collapsibles (#1050)
- Jules ARIA improvements on subgroup members (#1023)
- Job Board hot-fix — `SORT_OPTIONS` regression from i18n (#1053)
- UI feedback: leadership color, Sprout points page, training ring centering (#1054)
- Pipeline send-reminder mobile overflow (#1055)
- Program comparison mobile attribution (#1056)
- Find-your-path SOC code → role title (#1057)
- Skill Mapper PDF radar chart (#1058)

---

*Update the status board on every PR landing. The board is the program's heartbeat.*
