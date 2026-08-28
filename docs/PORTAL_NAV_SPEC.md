# Portal Nav Spec — Member Top-Nav + Per-Persona Rules

**For:** the next portal PR (fold in here). **Status:** ✅ IMPLEMENTED (2026-06-22, #2069) — the
member nav is now a flat single-level top-nav (all routes in one scrollable row, primary first;
contextual left sidebar hidden for members at desktop). See `WorkspaceShell.tsx` (memberFlatNav) +
`css/portal-main-extracted.css` (member flat-nav + sidebar hide). Reachability (§2) is satisfied
structurally: every route lives in the flat nav, so nothing is orphaned.
**Design source of truth:** `docs/mockups/wa-v2-member.html` (member) + `docs/mockups/workforceap-admin-full.html` (staff).
**Rule of thumb:** **members = flat top-nav · staff = dense left sidebar.**

---

## 1. Member nav — flat top-nav (the change)

**Today (live):** members get a two-level nav — top tab-bar (4 tabs) **+** a contextual left sidebar showing the active tab's sub-items. That left rail is the redundancy to remove.

**Target (from `wa-v2-member.html`):** a single **flat top-nav, 6 items, no left sidebar**:

| Label | href | (current source) |
|---|---|---|
| Dashboard | `/dashboard` | journey/Home |
| Training | `/dashboard/program` | My Program |
| AI Tools | `/dashboard/ai-tools` | Career Toolkit |
| Career Brief | `/dashboard/career-brief` | My Career Plan |
| Certificates | `/dashboard/certifications` | My Certificates |
| Messages | `/dashboard/messages` | Messages |

- Desktop: horizontal top nav (centered, ~max-width 1100). Mobile: bottom tab bar (kit `AppShellMember` already does both).
- **Remove the member desktop left sidebar entirely.** Staff portals keep theirs (see §3).

## 2. ⚠️ Reachability requirement (do NOT orphan)

The flat nav **drops ~12 pages from the bar**. Each MUST stay reachable or it's orphaned (a CSS "hide the sidebar" alone breaks these — already tried + reverted). Required homes:

| Dropped page | href | Must be reachable from |
|---|---|---|
| Job Board | `/dashboard/jobs` | Dashboard "Active Job Pipeline" card + Resume/AI Tools |
| Job Applications | `/dashboard/job-applications` | Jobs page (sub-nav/tab) |
| Resume | `/dashboard/resume` | Dashboard resume banner + Jobs page |
| My Progress | `/dashboard/readiness` | Dashboard + Training page |
| Weekly Recap | `/dashboard/weekly-recap` | Dashboard "Weekly Recap" insight card |
| Skill Missions | `/dashboard/missions` | Training page (in-content) |
| Path to certification | `/dashboard/program/start` | Training page |
| WIOA Qualification | `/dashboard/learning/wioa-qualification` | Training / Career Brief |
| Learning Hub | `/dashboard/learning` | AI Tools page (in-content) |
| Find your career | `/dashboard/learning/find-your-career` | AI Tools / Learning Hub |
| Training Preassessment | `/dashboard/skills-assessment` | Training page |
| Resources | `/dashboard/resources` | AI Tools page |
| Help & Support | `/dashboard/help` | top-bar account menu / footer |
| Member Guide | `/dashboard/guide` | top-bar account menu / footer |
| Profile & Settings | `/dashboard/profile` | top-bar account menu (exists) |
| Lilley (AI Career Coach) | `/dashboard/counselor` | AI Tools page (in-content) |
| Voice + Career Studio | `/dashboard/ai-tools/studio` | AI Tools page (in-content) |

**Acceptance:** after the change, every href above resolves from a visible link (not the removed sidebar). QA checklist = click each from a signed-in member session.

## 3. Staff nav — keep the dense sidebar (no change)

Employer / Partner / Counselor / Admin correctly use the dense **left sidebar** (`WorkspaceShell` / `*PortalShell`). This matches the locked direction (sidebar for staff) and the `admin-full` mockup. **Do not flatten staff portals.** Verified rendering: admin Today/Command-Center/Students/Board-Outcomes, employer overview, counselor, partner.

## 4. Implementation notes

- Prefer the kit `components/portal/kit/AppShellMember.tsx` (flat top-nav + mobile bottom-tabs) for the member shell, **or** add a member-scoped flat mode to `WorkspaceShell`.
- If swapping the member shell, **preserve existing `WorkspaceShell` features**: resume-upload hint, portal role-switcher, super-admin/impersonation banner, footer, theme toggle, account menu.
- The `html[data-portal-role="member"]` hook (set in `WorkspaceShell`) is available for member-scoped CSS.
- Dark mode already works for the kit (`--wa-*` tokens flip on `html.dark`); keep new nav token-driven.
- Member nav data lives in `lib/nav/portalNav.ts` (`MEMBER_PORTAL_NAV_ITEMS`).

## 5. Out of scope / done

- Dark mode tokens (done), per-page reskin content (done on branch behind kit), `?ui=kit` lean paths (done).
- This spec is **only** the member nav IA flatten + the reachability guarantee.
