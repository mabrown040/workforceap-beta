# Portal Nav Spec — Live IA + Reachability

**Status (2026-09-18):** Document the **live** member + staff navigation. Do not “restore”
a flat-only member shell from older #2069 notes — that claim drifted from production.

**Design references:** `docs/mockups/wa-v2-member.html` (aspirational flat top-nav),
`docs/mockups/workforceap-admin-full.html` (staff). **Live code** wins over mockups when
they disagree: `WorkspaceShell.tsx`, `MemberPortalTopNav.tsx`, `lib/nav/portalNav.ts`,
`docs/KIT_GUIDE.md`.

**Rule of thumb:** **members = warm left rail (desktop) + sticky top tabs (mobile) ·
staff = dense left sidebar (+ role mobile bottom tabs).**

---

## 1. Member nav — what ships today

### Desktop (≥769px)

`WorkspaceShell` with `portalRole="member"` renders the full `MEMBER_PORTAL_NAV_ITEMS`
command rail (primary destinations visible; Tools / Progress / Account in disclosed
groups). Kit tokens: warm surface, ~232px rail (208 laptop / 72 collapsed), sentence-case
labels, 16px / 44px targets, `aria-current` on the most specific destination only.

### Mobile (≤768px)

`MemberPortalTopNav` sticky horizontal tabs (daily destinations). The sidebar becomes the
hamburger drawer for the full IA. `MobileBottomNav variant="portal"` is a **no-op**.

| Tab label (i18n) | href |
|---|---|
| Dashboard | `/dashboard` |
| My program | `/dashboard/program` |
| Career toolkit | `/dashboard/ai-tools` |
| Counselor chat | `/dashboard/messages` |
| Job board | `/dashboard/jobs` |
| Profile | `/dashboard/profile` |

Profile replaced a duplicate Lilley/AI Advisor tab (AI Advisor stays under AI Career Tools
in the rail/drawer).

### Historical flat-nav target (not live)

An earlier plan (#2069 / `wa-v2-member.html`) aimed at a single flat top-nav with **no**
member left rail. That is **not** the current shell. Treat the table in older revisions as
an aspirational mockup only. Do not hide the member rail with CSS alone — that previously
orphaned destinations and was reverted.

---

## 2. Reachability requirement (do NOT orphan)

Secondary member routes must stay reachable from the rail/drawer or an in-page home.
Examples: certificates, career brief, job applications, resume, readiness, weekly recap,
missions, learning hub, help, guide, Lilley (`/dashboard/counselor`), Career Studio.

**Acceptance:** every `MEMBER_PORTAL_NAV_ITEMS` href is either a top tab or one click from
the rail/drawer (or a documented in-page link). QA = signed-in member session.

---

## 3. Staff nav — dense sidebar (unchanged)

Employer / Partner / Counselor / Admin keep the dense left rail. **Do not flatten staff
portals.**

### Staff mobile bottom tabs (subset of the rail)

| Role | Tabs |
|---|---|
| Employer | Overview · Jobs · Pipeline · Messages |
| Counselor | Overview · Inbox · Members · Messages |
| Partner | Overview · Members · Messages · Milestones · Outcomes |
| Admin | Command Center (`/admin`) · Students · Messages |

Admin and counselor mobile destinations must stay aligned with rail hrefs when labels
rename (e.g. Command Center, Students, Inbox zero).

---

## 4. Implementation notes

- Compose new chrome from kit shells (`AppShellMember` / `AppShellSidebar`) when swapping
  shells; until then preserve `WorkspaceShell` features (resume hint, role switcher,
  impersonation banner, footer, theme, account menu).
- `html[data-portal-role="member"]` is set in `WorkspaceShell` for member-scoped CSS.
- Dark mode: `--wa-*` tokens via `light-dark()`; no new token families.
- Nav data: `lib/nav/portalNav.ts` (+ i18n twin). Public marketing chrome is separate
  (`MainNav`, `MobileBottomNav` marketing variant, Astro `Layout.astro`).

---

## 5. Out of scope here

- Full Career Studio consolidation / rail rewrite
- New public `/membership` page (Membership noun currently → `/apply` in About)
- Merging Astro vs Next dual public renderers
