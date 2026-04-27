# Live Portal Audit — workforceap.org (2026-04-26)

Headless audit of the live production site, logged in as super-admin (`mabrown040@gmail.com`) acting as both member (mabrown040 / Michael Brown — gmail account) and admin. Captured at 1280×800 desktop, 768×1024 tablet, 375×812 mobile, plus dark mode samples and DOM/network probes.

**Scope covered:** logged-out site (homepage, /apply step 1–3, /login), member portal (~20 routes incl. AI tool subpages), admin portal (overview, coursera, diagnostics, member detail). Coursera flow, Mark Complete, role-toggle, notifications panel, footer/landmark counts.

**Not yet covered:** counselor / partner / employer portals, brand-new zero-state member account, account-create finish (no fake account created), keyboard-only navigation, Coursera xAPI completion round-trip, email templates, loaner-laptop flow, print stylesheet.

---

## Severity legend

- **P1** — broken or contradictory state visible to members; integration gaps with real impact.
- **P2** — IA / responsive / duplication issues that confuse navigation or waste space.
- **P3** — microcopy, label, and small consistency issues.
- **P4** — visual polish, alignment, density.
- **P5** — performance / minor / nice-to-have.

---

## P1 — Bugs / data integrity / contradictions

| # | Page | Issue |
|---|---|---|
| 1 | `/dashboard/messages` | Test fixture `[ARCHIVED FIXTURE] launch test message removed from active surfaces` rendering as the most recent message bubble. Note from owner: visible because of super-admin context — needs a code review confirming non-admin members never see fixture rows; the prefix should not exist at all in the production query path. |
| 2 | `/dashboard/training` | All 16 per-course "Open in Coursera" links go to `https://coursera.org/` (homepage), not the specific course. The top-level "Open Coursera" button correctly hits `/api/member/coursera/launch` (SSO). Per-course deep links are missing. |
| 3 | `/dashboard/training` | Course list rendered **twice** in DOM: 32 course H3s, 32 "Open in Coursera" links, 32 "Mark Complete" buttons for a 16-course program. KPI bar ("Courses 1/16 / Progress 6%") rendered twice in two different markup styles. Two intro paragraphs with different copy. |
| 4 | `/dashboard/training` | "Mark Complete" has no undo affordance. A misclick advances "courses completed" with no member-facing way to revert. |
| 5 | `/dashboard` | AI Coaches block (4 cards), "Your next steps / Strengthen your profile" card, and "Recent AI Activity" list all rendered **twice** in DOM. Likely two responsive variants both mounted. |
| 6 | `/dashboard` | Same page contains three different welcome strings: H1 "Welcome back, Michael" + mid-page "Hi, Michael" + later "Welcome back, Michael." (period). |
| 7 | `/dashboard` | Profile completion shown as **three different values** on related surfaces: dashboard "Strengthen your profile" = 50%, dashboard pre-screening progress = 63%, profile page mobile = 75%. None reconcile. |
| 8 | `/dashboard` | Onboarding Checklist contradicts Training Progress: "Start training ✓" checked while training reads 0/16 courses complete. After clicking Mark Complete on one course the value bumped to 1/16 / 6%. |
| 9 | `/dashboard` | Application state is self-contradictory: Application Journey shows "Interview — Awaiting counselor" while a separate card prompts "Submit & become interview eligible". User can't tell whose move it is. |
| 10 | global header | Notification bell badge desyncs from panel content. Bell shows "1" unread; opening the panel shows "All caught up / notifications_none". |
| 11 | `/dashboard/messages` | Conversation header reads "Chat with Michael Brown — replies within 2 business days". The signed-in member IS Michael Brown — the header should name the counselor, not the member. |
| 12 | `/dashboard/messages` desktop | Sidebar visually overlaps page header. "Messages" H1 is half-clipped behind the pink sidebar panel; top tab strip ("…ram / Jobs / AI Toolkit") partially covered. Z-index/positioning bug. |
| 13 | `/dashboard/jobs` and `/dashboard/ai-tools` | Two `<footer>` elements on these specific routes (DOM count = 2); every other dashboard route has 1. Marketing-site footer leaking into the portal layout for these two routes only. |
| 14 | `/dashboard/skills-assessment` | Score reads "97%   95/90 points" — score over the maximum. Either the cap is wrong, the score is wrong, or "/90" is a typo for "/100". |
| 15 | `/dashboard/job-applications` | Same job ("Browser Tester / QA Audit Co" + "IT Support Technician / Dell") rendered twice in two different layouts on the same page — once as compact "Saved/Applied" pills, once as full cards beneath. |
| 16 | global nav | "My Counselor" label points to two different destinations: `/dashboard/messages` from the mobile bottom nav, `/dashboard/counselor` (AI voice coach) from the sidebar. |
| 17 | `/dashboard/counselor` | All page content (Hi Mike / Start Session CTA / What to expect list) renders at low opacity — looks like a stuck loading or disabled state. CTA barely readable. |
| 18 | `/dashboard/messages` and `/dashboard` (dark mode) | Dark-mode contrast failures. Pink message bubbles on dark bg make body text near-invisible. Same pattern on dashboard "Your training is ready" pink-on-pink banner and `bg-rose-100` chips. |
| 19 | tablet 768px | Two horizontal navs render simultaneously: top tab strip and a secondary pill row both visible. Show/hide variants not gated cleanly between desktop and mobile breakpoints. |
| 20 | global mobile top tab strip | Jobs tab disappears at 375px — only Home / My Program / AI Toolkit fit. No overflow indicator. Members on /jobs see no active tab in the strip. |
| 21 | `/apply` step 3 (account create) | First Name, Last Name, and Email show `*` in their visible labels but the input `required` attribute is `false`. Phone, address, city, ZIP correctly set required. Browser-side validation will let blanks through on the most important identity fields. |
| 22 | `/apply` step 2 and step 3 | Step heading rendered twice on each step with slightly different copy ("choose your program" vs "choose your program(s)" on step 2; "set up your member path" vs "create your account" on step 3). |
| 23 | admin pipeline | Two separate "Michael Brown" member records exist: `49662f29…` (gmail, AI Professional Practitioner Certificate, primary) and `0954a0b6…` (ymail, Pending enrollment). Identity collision — admin needs a merge action; member-facing flows could route to wrong record. |
| 24 | admin program list | Same program appears under two different display names across the system: "AI Professional Developer Certificate (IBM)" in the admin change-program dropdown vs "AI Professional Practitioner Certificate" everywhere else (apply, member program, training). Different names for the same record. |
| 25 | admin diagnostics | "3 Errors" reported by the diagnostics page on a clean morning audit — needs triage list visible to admin. |

---

## P2 — Information architecture / responsive / duplication

| # | Page | Issue |
|---|---|---|
| 26 | global IA | Sidebar acts as sub-nav per top tab but its inventory shifts opaquely. **Messages and My Counselor only appear under Home** — invisible from Jobs, My Program, AI Toolkit. Members must return Home to find them. |
| 27 | `/dashboard/ai-tools` sidebar | "Profile & Account" listed under AI Toolkit sub-nav. Profile is unrelated to AI tools — belongs in the user/account menu. |
| 28 | `/dashboard/resources` IA | Top tab "AI Toolkit" + sidebar group "AI Toolkit" + breadcrumb "Member Portal / Learning Hub / Program resources" + H1 "Program resources". Three different parent labels for the same page. |
| 29 | `/dashboard/help` vs `/dashboard/resources` Support card | Both surfaces carry counselor + contact info. Two pages doing the same job. |
| 30 | `/dashboard/guide` vs `/dashboard` Onboarding Checklist | Both contain a 5-step "your journey" checklist with overlapping copy (profile → assessment → AI tools → interviews → apply). Two checklists, same content, will drift. |
| 31 | `/dashboard/training` vs `/dashboard/learning` | Both pages show the same course list with Open in Coursera + Mark Complete rows. Pick one canonical training surface. |
| 32 | `/dashboard/career-brief` vs `/dashboard/weekly-recap` | Both show readiness score, KPI cards, weekly recap content. Overlapping panes. |
| 33 | `/dashboard/learning/find-your-career` | Page lives under Learning Hub but is reached from the AI Toolkit sub-nav. Why is exploring careers under Learning Hub when the user enters from AI Toolkit? |
| 34 | `/dashboard/jobs` | Filter sidebar appears to render twice in the DOM (desktop + mobile drawer not gated by a single responsive show/hide). |
| 35 | global desktop sidebar | Sidebar is ~250px with 2–4 items in vertically padded card groups → enormous empty whitespace on Home, Messages, Counselor, Weekly Recap. Either thinner rail, collapse-by-default, or move sub-nav into the top tab strip. |
| 36 | `/dashboard` | "Pre-screening" form on Home replicates fields on `/dashboard/profile` (employment status, primary goal, weekly hours, barrier, hear-about-us, phone, address, workforce assistance). Two edit surfaces, no source of truth. |
| 37 | `/dashboard` | "Recent AI Activity" panel on Home duplicates `/dashboard/ai-tools/history` content. |
| 38 | `/dashboard` | "Add another application" CTA appears twice (Active Curriculum stub + Roles That Match You section). |
| 39 | `/dashboard/program` course list | First course shows both `UP NEXT` pill and `Current` badge — pick one. |
| 40 | `/dashboard/jobs` desktop | Filter row uneven: row 1 = 3 cols (Search / Program / Location), row 2 = 4 cols (Job type / Sort / Min / Max). Min-salary placeholder ellipsized: `Optional max (annual US…`. |
| 41 | `/dashboard/program` mobile, `/dashboard/training` mobile | Course rows: status pill + title + Open-in-Coursera button + Mark-Complete button all on one cramped horizontal row. Buttons collapse to 2-col stack with text wrap (`Open in / Coursera`). Should stack vertically: title above, action row below. |
| 42 | `/dashboard/program` mobile | Mid-word break: "AI Fundamenta / ls with Claude" — likely `word-break: break-all` applied to course titles. |
| 43 | `/dashboard` desktop | AI Coaches grid renders 3 + 1 (Voice Interviewer alone on row 2). Either 4-col, 2×2, or stagger with the wide "Career & Business Coach" card. |
| 44 | `/dashboard/profile` desktop | Significantly denser/messier than the mobile equivalent — overlapping cards, no clear column structure. Mobile is the better starting point. |

---

## P3 — Microcopy / state / labeling

| # | Page | Issue |
|---|---|---|
| 45 | `/dashboard` | "Application Status: Not accepted" — sounds rejected. Use "Pending review" / "Awaiting counselor review". |
| 46 | `/dashboard/resources` | "Your Counselor" card: "A counselor will be assigned as you move through enrollment." Member is already enrolled. State-stale copy. |
| 47 | `/dashboard/readiness` | Top KPI cards 100% / 55% / 67% / 100% but overall reads "Progress: 0%". Component vs overall math doesn't reconcile. |
| 48 | `/dashboard/readiness` | "Top Job title 1 / 2 / 3 / Top Industry 1 / 2 / 3" rendered as literal placeholder strings — template stubs, not filled. |
| 49 | `/dashboard/help` | Self-contradictory SLA: "We'll process your request and follow up within 2–3 business days" vs Messages "replies within 2 business days" vs `/apply` "1–2 business days". Three SLAs for similar promises. |
| 50 | `/dashboard/certifications` | Active Pathway shown is "Digital Literacy → CompTIA A+ → IT Support Certificate → Job readiness" — but member is enrolled in AI Professional Practitioner Certificate. Pathway hard-coded for a different program. |
| 51 | `/dashboard/career-brief` | "Jobs in **Pflugerville, TX**" — hard-coded city or pulled from member profile? Member's saved address is "207 Settlers Valley Drive" with no city explicit. Should localize via member data, not hard-code. |
| 52 | `/dashboard/skills-assessment` | "Update in Skill Mapper" appears next to a saved snapshot — verb is ambiguous (re-run? edit? open?). |
| 53 | `/dashboard/job-applications` | "Click to edit" hint shown as inline ghost text in two list rows. If row is fully clickable, the label is redundant; if not, it's misleading. |
| 54 | global header | "Member" pill toggle (top right) — visible "ADMIN" uppercase label sits next to "Member" and reads as a separate badge, not a toggle. New users won't know it's interactive. The aria-label "View: Member Portal. Switch portal view" is clear; the visual pattern isn't. |
| 55 | `/dashboard` AI coaches cards | Inconsistent badge style: "WORKFORCE READINESS & CAREER COACH" / "QUICK INTRO" / "RESUME COACH" / "MOCK INTERVIEW" — mixed casing and lengths. Pick one badge pattern. |
| 56 | `/dashboard` AI coaches CTAs | Inconsistent CTA verbs: "Talk to AI coach" / "Build elevator speech" / "Open resume coach" / "Start mock interview". Pick one verb pattern. |
| 57 | `/login` | "Stay signed in for 7 days" defaults checked. Shared-device users may not want this default; consider unchecked default with a "remember me" affordance. |
| 58 | admin coursera page | Manual mapping form pre-populates "Member Success · member.success@workforceap.org" — looks like demo/template data leaking into the form. |
| 59 | global program nomenclature | "AI Professional Developer Certificate (IBM)" vs "AI Professional Practitioner Certificate" appear inconsistently — fix at the data layer or with a single display-name source. |

---

## P4 — Visual / responsive polish

| # | Page | Issue |
|---|---|---|
| 60 | global mobile top tab strip | At 375px, only 3 tabs fit; remainder hidden. No "+more" affordance or scroll. |
| 61 | global footer | Footer rendered twice in DOM on most member pages (left-right split + center-with-pipes). Visually one is hidden but both occupy the tree. |
| 62 | `/dashboard` desktop | "Log External Certification" button floats alone on its own row top-right with empty space — pair with a related action. |
| 63 | global dark mode | Pink-on-pink contrast failures across rose-tinted cards (`bg-rose-100` family). |
| 64 | `/dashboard` pre-screening | Dual control rendering on the same field — employment status appears as both `[combobox]` and an inline button-group. Pick one. |
| 65 | global | Layout shift: top horizontal nav re-renders pill state late after navigation (visible flash of unstyled active state on slow nav). |

---

## P5 — Performance / minor

| # | Page | Issue |
|---|---|---|
| 66 | global | CSS preload warning: `7a0fbff67f8ec882.css` preloaded but unused on window load. Either fix the `as` attr or drop the preload. |
| 67 | `/dashboard/training` | Each course displays "~10 hrs" — likely a hard-coded display value, not real per-course Coursera hours. Suspicious that all 16 courses are exactly 10 hours. |

---

## Cross-cutting themes (root causes worth fixing once)

- **Responsive duplication.** Multiple pages render desktop and mobile variants both into the DOM rather than gating with one canonical responsive structure. Symptoms: dashboard duplicate AI coaches block, training duplicate course list, jobs filter sidebar twice, double footer in DOM. One Tailwind/CSS gating pass would clear several P1/P2 items.
- **State-truth drift.** Profile-completion %, application status, training progress, and onboarding checks each source from different APIs/state. Single source of truth + derived UI would resolve the contradictions in #5–#9.
- **Coursera per-course deep links.** Every course-row "Open in Coursera" loses program context. Even if the SSO entrypoint is at the top button, members will keep using the per-row buttons because they're closest to the title they're trying to open.
- **Role-aware fixture filtering.** Owner notes the `[ARCHIVED FIXTURE]` row is super-admin-only; verify it never reaches a non-super query path. Audit all `*_FIXTURE`, `__test__`, `[demo]`, `member.success@workforceap.org` rows similarly.
- **Program nomenclature.** Same program referenced under different display names depending on surface. Unify at the data layer.
- **IA discoverability.** Messages / Counselor only reachable via Home tab. Member primary tasks (talk to counselor, send a message) should be reachable from any tab.

---

## Need-to-verify (separate audit passes)

- Counselor / partner / employer portals.
- Brand-new member zero-state (Dashboard / Program / Training / Readiness / Certifications / History without prior data).
- `/apply` step 3 finish (would create a real account — needs throwaway email).
- AI tool subpages mid-flow (resume rewriter, voice interview, interview practice) — only audited landing states.
- Coursera xAPI completion round-trip (admin Coursera page is wired; need to verify a real completion event flows from Coursera → admin → member training progress).
- Loaner-laptop benefit flow.
- Email templates fired by enrollment / message / completion events.
- Print stylesheet for resume / certificates exports.
- Keyboard-only navigation, focus traps in modals.
- Touch-target sizes on mobile (44px minimum).
- Notifications panel content shapes.

---

*Tooling: gstack `browse` (headless Chromium), DOM JS probes for footer/landmark counts, network capture for Mark Complete + apply step transitions. Screenshots not committed; raw captures live under `C:/Users/mabro/AppData/Local/Temp/wfap-audit/` for the duration of the audit session.*
