# Cross-portal pages audit (summary)

**Automation:** Rendered static paths are listed in `STATIC_PATHS`; intentional aliases are listed separately in `REDIRECT_ONLY_PATHS`. **`npm run audit:portal`** writes a fresh, gitignored **`test-results/portal-audit-results.json`** on success or failure.

**Full plan:** [`CROSS-PORTAL-AUDIT-PLAN.md`](./CROSS-PORTAL-AUDIT-PLAN.md)  
**Member deep-dive:** [`MEMBER-PAGES-AUDIT.md`](./MEMBER-PAGES-AUDIT.md)  
**UX findings:** [`PORTAL-UI-UX-AUDIT-FINDINGS.md`](./PORTAL-UI-UX-AUDIT-FINDINGS.md)

---

## Route counts (static vs dynamic)

| Surface | Rendered static checks | Dynamic pending | Redirect-only inventory |
|---------|------------------------|-----------------|-------------------------|
| Member | 53 | 6 | 13 |
| Admin | 74 | 16 | 0 |
| Employer | 16 | 5 | 0 |
| Partner | 10 | 1 | 2 |
| Counselor | 14 | 2 | 0 |

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

The manual GitHub workflow has two fixed policies: **`isolated_preview`** runs every rendered route at desktop/mobile against the exact `PREVIEW_SITE_URL` secret; **`production_canary`** visits only the five portal roots at desktop width. Both use five distinct `E2E_<ROLE>_*` identities and the explicit allowed/denied role matrix.

For a local run, use `PORTAL_AUDIT_MODE=local`, a loopback `PLAYWRIGHT_BASE_URL`, and one distinct `E2E_<ROLE>_EMAIL` / `E2E_<ROLE>_PASSWORD` pair per selected role. Open **`test-results/portal-audit-results.json`** or download the workflow artifact.

If the file is missing, the audit has not been executed in that environment yet.

---

## Changelog

| Date | Notes |
|------|--------|
| 2026-08-29 | Trusted-target gate, distinct five-role identities, cross-role denial matrix, redirect-only inventory, bounded exhaustive preview, and small production canary. |
| 2026-04-08 | Initial summary; path inventory from `portal-audit-paths.mjs`. |
