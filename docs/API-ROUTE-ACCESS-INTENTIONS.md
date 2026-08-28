# API routes — intentional access breadth (RBAC)

Short reference for endpoints that are **not** “signed-in member only” in the narrow sense, or that live under a prefix that suggests tighter scope than they enforce. Use this when auditing auth: absence of `getUser()` here is often deliberate.

## Unauthenticated or weakly gated (by design)

| Route area | Notes |
|------------|--------|
| `app/api/(portal)/dashboard/jobs/**` | Public job board listings and detail for the student dashboard. |
| `app/api/auth/**` | Login, logout, password reset, MFA setup/verify — session establishment flows. |
| `app/api/apply/**`, `app/api/member/signup`, `app/api/partner/signup`, `app/api/invite/*` | Onboarding and invitations. |
| `app/api/health/**` | Liveness / SLO probes. |
| `app/api/webhooks/**` | External providers; secured via provider secrets/signatures where applicable, not end-user sessions. |
| `app/api/xapi/**` | LRS / xAPI integration; uses OAuth or deployment-specific auth, not portal `getUser()`. |
| `app/api/contact`, `app/api/careers/**`, `app/api/referral-sources`, `app/api/mentors` (GET) | Marketing / discovery surfaces. |
| `app/api/placement-survey`, `app/api/public/wioa-qualification/**` | Public flows (often with IP rate limits on voice). |
| `app/api/cron/**` | Scheduled jobs; must rely on deployment secrets (e.g. `CRON_SECRET`), not cookies. |

## Authenticated, path says “counselor” but open to members

| Route | Notes |
|-------|--------|
| `POST /api/counselor/feedback` | Any logged-in portal user may post (readiness / AI career coach completion on `/dashboard/counselor`). Not restricted to staff `isCounselor`. |
| `POST /api/counselor/session` | Any logged-in member may mint a Lilley voice session with their member/program context. This is a member AI career-coaching route, not staff or caseload tooling. |

## Subgroup leader APIs

| Route | Notes |
|-------|--------|
| `GET /api/subgroup/members`, `GET /api/subgroup/members/[id]`, `GET /api/subgroup/dashboard` | Require session; access is limited to users returned by `getSubgroupsForUser()` (subgroup `leaderId` or `subgroup_leaders` row). |

## Staff / counselor enforcement patterns elsewhere

- Prefer `isAdmin` + `isCounselor` from `@/lib/auth/roles` (includes `user_roles` admins and super-admins) over raw `profiles.role` checks alone.
- Member-scoped counselor actions should call `assertStaffCanAccessMemberRecord` (or `resolveActOnBehalf`) so only org admins and assigned counselors act on a given `memberId`.
