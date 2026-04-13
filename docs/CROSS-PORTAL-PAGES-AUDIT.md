# Cross-portal pages audit (summary)

**Automation:** Static paths are listed in `scripts/lib/portal-audit-paths.mjs` and exercised by **`npm run audit:portal`**, which writes **`docs/portal-audit-results.json`** after a successful login.

**Full plan:** [`CROSS-PORTAL-AUDIT-PLAN.md`](./CROSS-PORTAL-AUDIT-PLAN.md)  
**Member deep-dive:** [`MEMBER-PAGES-AUDIT.md`](./MEMBER-PAGES-AUDIT.md)  
**UX findings:** [`PORTAL-UI-UX-AUDIT-FINDINGS.md`](./PORTAL-UI-UX-AUDIT-FINDINGS.md)

---

## Route counts (static vs dynamic)

| Surface | Static (in automation) | Dynamic (spot-check only) |
|---------|------------------------|---------------------------|
| Member | 41 | `/dashboard/career-brief/[slug]`, `/dashboard/career-library/[id]`, `/dashboard/jobs/[id]`, `/dashboard/mentors/[mentorId]` |
| Admin | 33 | `/admin/blog/[id]/edit`, `/admin/blog/preview/[slug]`, `/admin/jobs/[id]`, `/admin/members/[id]`, `/admin/members/[id]/lifecycle`, `/admin/members/[id]/readiness`, `/admin/partners/[id]`, `/admin/subgroups/[id]`, `/admin/subgroups/[id]/edit` |
| Employer | 12 | `/employer/jobs/[id]`, `/employer/candidates/[studentId]` |
| Partner | 12 | `/partner/members/[id]`, `/partner/referred-members/[memberId]` |
| Counselor | 5 | `/counselor/students/[memberId]` |

---

## Per-surface notes (high level)

| Surface | Shell / nav | UX themes to verify manually |
|---------|-------------|--------------------------------|
| **Member** | `WorkspaceShell` + mobile bottom nav | Duplicate `h1`, footer vs bottom bar, AI tool layout family |
| **Admin** | Admin sidebar / nav | PII on dashboards; dense tables; settings |
| **Employer** | Employer portal shell | Pipeline tables, job forms, candidate detail |
| **Partner** | Partner nav | Referral stats, member pipeline, exports |
| **Counselor** | Counselor nav | Student roster, messages, resources |

---

## Last run

Run **`npm run audit:portal`** locally or in CI with `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_MEMBER_EMAIL`, and `PLAYWRIGHT_PORTAL_PASSWORD` set, then open **`docs/portal-audit-results.json`**.

If the file is missing, the audit has not been executed in that environment yet.

---

## Changelog

| Date | Notes |
|------|--------|
| 2026-04-08 | Initial summary; path inventory from `portal-audit-paths.mjs`. |
