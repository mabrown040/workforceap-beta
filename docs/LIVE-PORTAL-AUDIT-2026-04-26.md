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

---

# Round 3 — Counselor / Partner / Admin sub-routes + edge cases (2026-04-26)

Continued audit. Covered: counselor portal (8 routes), partner portal (10 routes incl. referred-member detail), admin sub-routes (members / jobs / employers / programs / assessments / wioa-screening / audit-logs / email-crons / metrics), 404 edge cases, AI tool subpage validation parity, marketing pages H1 sweep, mobile touch-target audit, login error path. Numbering continues from #67.

## P1 (round 3) — Bugs / data integrity

| # | Page | Issue |
|---|---|---|
| 68 | `/dashboard/<nonexistent>` (member 404) | Authenticated member hitting an unknown dashboard route gets the **public marketing 404** with the **logged-out top nav** ("Login / Counselor sign in / Partner sign in / Employer sign in / Apply Now") instead of the portal shell. Auth context appears lost in the 404 fallback layout. Members see sign-in prompts as if they were logged out. |
| 69 | `/dashboard/jobs` and `/dashboard/ai-tools` | Both `<footer>` elements on these routes have `display: block` and are visible to the user — confirmed via `offsetParent !== null` and `getComputedStyle().display`. Not a hidden DOM duplicate; the second footer renders on screen. Closes the loop on round-2 #36. |
| 70 | `/counselor` overview | **Un-decoded HTML entities rendered as literal text** in the dashboard copy: "You&rsquo;re caught up &mdash; nice work." Other counselor sub-routes do not have this issue — only `/counselor`. |
| 71 | `/counselor` dashboard | Three different welcome strings on the same page: "Counselor dashboard — welcome back, Michael" + "Counselor Dashboard / Good evening, Michael" + the page title. Same drift pattern as member `/dashboard` (round 1 #29). |
| 72 | `/partner` portal | Partner-org context label reads literally "Test Students". If this is fixture/demo data leaking into the live portal it is the same fixture-leak class as `[ARCHIVED FIXTURE]` (#1). Confirm whether "Test Students" is a real partner org or test data showing in production. |
| 73 | `/partner/referred-members/<id>` | Member detail page (Alec Cargin) renders **the entire detail card twice** — breadcrumb, member snapshot, partner outreach all duplicated. Same class of responsive duplicate-render bug as `/dashboard` and `/dashboard/training`. |
| 74 | `/apply/create-account` (step 3) vs `/dashboard/ai-tools/elevator-pitch` and `/dashboard/ai-tools/resume-rewriter` | Required-field semantics drift across forms in the same project. Apply step 3: First/Last/Email visibly `*` but `required=false`. Elevator-pitch: starred fields correctly `required=true`. Resume rewriter: starred fields correctly `required=true`. Apply form is the outlier — and it is the highest-stakes form in the funnel. |
| 75 | `/admin/programs`, `/admin/employers`, `/admin/metrics` | **Multiple `<h1>` per page** — heading hierarchy violation. `/admin/programs` has 3 h1s ("Programs" + "Enrollment stats" + "Program catalog settings"); `/admin/employers` has 2 ("Employers" + "Create employer portal account"); `/admin/metrics` has 3 ("Analytics" + "Activity — Last 14 Days" + "Enrollment by Program"). One h1 per page; everything else h2/h3. |

## P2 (round 3) — IA / consistency

| # | Page | Issue |
|---|---|---|
| 76 | `/employer` redirect | Hitting `/employer` while signed in as super-admin redirects to `/admin/employers` instead of an employer portal preview. There is no documented employer-portal landing surface to dogfood without "open a company's portal as a super-admin". Add a `/employer/preview` or first-class employer dashboard. |
| 77 | counselor + partner sidebar IA | Both portals expose Messages, Resources, and Settings/Guide as separate sub-nav items (good), but counselor adds an "In-office sessions" workflow that doesn't exist in partner, and partner has "Attention queue / Milestones / Outcomes snapshot" that don't exist in counselor. The two roles likely *do* need different inventories — but rationalize the shared concepts (Messages, Resources, Guide, Settings) so they sit in the same sidebar group across roles for predictable mental model. |
| 78 | `/admin/employers` H1 + form | "Create employer portal account" appears as a sibling H1 below "Employers" — consider promoting to its own page (`/admin/employers/new`) so the index page is one job and creation is another. |
| 79 | admin H1 capitalization | Inconsistent across the admin section: "Members" / "Jobs" / "Programs" / "Employers" / "Skills assessments" (sentence) / "WIOA screening queue" (sentence with caps abbr) / "Audit Logs" (Title Case) / "Email & Cron Management" (Title Case) / "Analytics". Pick a convention (sentence case is the safer default) and apply globally. |
| 80 | AI tool h1 capitalization | "Resume Rewriter" / "Resume Coach" / "Interview Practice" / "AI Elevator Speech" all Title Case, but **"Voice interview"** is sentence case. Outlier. |
| 81 | global header role pill | Sign-in/role pill shows as "Admin" + dropdown labelled "Member" (or "Counselor" / "Partner") next to each other in the top-right. The literal string "Super admin preview" in counselor and partner portals reinforces that this is a preview-as-role mode for super-admins. Worth surfacing the active *acting role* more prominently — e.g., banner at the top of each non-default portal, not just a tiny pill. |
| 82 | global header — two Sign Out buttons | Two `<button>` elements with text "Sign out" on the same page (one in expanded sidebar, one in user/account section). Either consolidate or label one as "Sign out (sidebar)" via aria-label so screen-reader users don't hear "Sign out, Sign out". |

## P3 (round 3) — Microcopy / state

| # | Page | Issue |
|---|---|---|
| 83 | `/counselor` overview | "Inbox zero. Members get back to you and you'll see them here." Reads as if member action is a precondition for visibility. Probably means "when members reply, you'll see them here." Tighten. |
| 84 | `/admin/diagnostics` | "3 Errors / 0 Warnings / 1 Success" with a vague "Drift Issues 0" — no triage list visible from the headline KPIs. The 3 errors should be reachable from the KPI card or surfaced below. |
| 85 | `/admin` overview | KPI text: "1 member thread over 48h without reply · 1 cron error in the last 7 days" — useful, but the "Review messages →" + "Check cron health →" CTAs sit in the same card without visual hierarchy. Either split into two cards or order the alerts by recency. |
| 86 | `/admin/coursera` | The manual mapping form pre-populates `member.success@workforceap.org` as the demo recipient. If left in production it acts as a default footgun — admin saving without changing it would route the mapping to a generic alias. Either remove the prefill or use a placeholder that disables submit. |
| 87 | partner portal | "Test Students" appears in the org-context label, breadcrumbs, exports labels, and outcomes copy ("Quick counts for Test Students."). If real, partner names like that should be sanity-checked at onboarding. |
| 88 | login error | "Invalid login credentials" — generic and security-correct. But the error appears in red below the form with no proximity to the failed field. Move to inline near the password field or to a single status region with `role="status"`. |

## P4 (round 3) — Visual / responsive

| # | Page | Issue |
|---|---|---|
| 89 | mobile dashboard touch targets | Six interactive elements measure smaller than the 44×44 minimum recommended target: "Training" link (46×16), "View all" (44×19), "Privacy" (40×44), "Terms" (34×44), "WorkforceAP site" (267×22), "Skip to main content" (174×40). Footer links and inline text-link CTAs are the offenders. Pad the hit area without changing the visual size. |
| 90 | `/blog/<slug>` post detail | No `<time>` element with publication date detected; only one share button. Either add a published-on date and full social/email share row, or remove the lone share affordance for a cleaner read. |
| 91 | `/programs` index | `[class*=program]` selectors match 273 nodes for 18 programs — heavy nesting. Either consolidate component class naming or audit for redundant wrapper layers. |

## P5 (round 3) — Observations / lower priority

| # | Page | Issue |
|---|---|---|
| 92 | `/login` | After failed sign-in, the password field is **not cleared**. Some teams clear it on failure to discourage retry-spam; others leave it for usability. Decide and document. |
| 93 | `/apply` step 1 | Radio inputs use parent-wrapped `<label>` (valid a11y) — *not a bug*. Documenting here so future audits don't re-flag it. |
| 94 | `/admin/jobs`, `/admin/blog`, `/admin/invites`, `/admin/sessions`, `/admin/board`, `/admin/exports`, `/admin/career-mappings` | Loaded cleanly with single footer, single H1, no entity bugs in this pass. Spot-check passes — not a deep audit yet. |

---

## Cross-cutting themes — round 3 additions

- **Layout shell inheritance is the #1 bug class.** Member dashboard 404 falls back to public marketing layout; `/dashboard/jobs` and `/dashboard/ai-tools` leak the marketing footer; counselor and partner portals are mostly clean — so the bug is specifically **member-portal-specific routes** that don't wrap the dashboard layout. Audit the route group structure (likely a `(dashboard)` group is missing a layout file or has a misplaced `not-found`).
- **Form validation parity.** Apply step 3 is the *only* form in the audit with starred labels but no `required` attribute. Run a one-shot lint/codemod across all forms: any input with a label containing `*` should have `required`.
- **Heading hierarchy in admin.** Multiple H1s on `/admin/programs`, `/admin/employers`, `/admin/metrics`. Cheap to fix; helps screen-reader users and SEO.
- **Fixture / demo data leaks.** `[ARCHIVED FIXTURE]` (member messages), "Test Students" (partner org label), "member.success@workforceap.org" (admin coursera prefill). Pattern is consistent — there is at least one demo seed running in production. A grep for fixture/demo/test/sample/sandbox prefixes across queries and prefilled values would clear several findings.
- **H1 / role label / breadcrumb drift.** Three different parent labels for the same page (#28). `/admin` and AI-tools pages mix Title Case and sentence case. One copy convention applied via a lint rule fixes a long tail.

---

## Need-to-verify (still / new)

- Counselor and partner portals at mobile + tablet breakpoints (only audited desktop in this round).
- Counselor portal "In-office sessions" flow end-to-end.
- Partner portal "Exports" CSV download — no permission prompt or filename pattern audited.
- Admin "Pause project" / destructive actions in `/admin/diagnostics` — not exercised.
- Coursera xAPI live event ingest — admin page is wired but no real event captured.
- Email & Cron Management page — listed routes, didn't open detail.
- Member-portal layout for staff/admin users who do NOT have a member record (this account has both — dual-role coverage may mask single-role bugs).
- Notifications panel item shapes (only confirmed empty state "All caught up" while bell badge said "1").
- Brand-new member zero-state (Dashboard / Program / Training / Readiness without any prior data).

---

*Round-3 tooling additions: JS DOM probes for `<footer>.offsetParent`, `getComputedStyle().display`, `<h1>` count per page, `tabindex`/`role` audit on apply step 2 program cards, touch-target geometry sweep at 375px, marketing-page H1 sweep across 13 pages.*

---

# Round 4 — Coursera connection deep dive + admin pipeline / fixtures (2026-04-26)

Focused audit of the Coursera integration (top-level launch endpoint, per-course links, course identification model, Mark Complete API, admin manual mapping page) plus admin pipeline, notifications panel, and remaining admin sub-routes. Numbering continues from #94.

## P1 (round 4) — Coursera integration

| # | Page / endpoint | Issue |
|---|---|---|
| 95 | `GET /api/member/coursera/launch` | The top-level "Open Coursera" button on `/dashboard/training` redirects to `https://www.coursera.org/o/workforce-advancement/admin/programs/workforce-advancement-project-8a3f0/main` — the **Coursera admin program-management page for the org**, not a learner-facing entry point. Members are routed into a Coursera admin surface they can't act on as learners. The launch endpoint redirect target is wrong. |
| 96 | `/dashboard/training` per-course links | Confirmed: every per-course "Open in Coursera" link is the literal string `https://coursera.org/` (homepage). No course-specific deep link. Combined with #95, **no path from the WAP training page actually opens the right Coursera course** — top button lands at admin/main, per-course buttons land at coursera.org root. |
| 97 | `/dashboard/training` link target inconsistency | Top "Open Coursera" link uses `target=""` (same tab, no `rel="noopener"`); per-course "Open in Coursera" links use `target="_blank"` with `rel="noopener noreferrer"`. Same affordance, different navigation behavior. Pick one — opening Coursera in a new tab is the standard pattern. |
| 98 | `/dashboard/training` course identification | Course rows carry **no `data-course-id`, `data-course-slug`, or any other Coursera identifier** in the DOM. Mark Complete buttons have no per-course data attribute on the button or its parent. The click handler appears to identify the course by DOM order or innerText — fragile, breaks under reorder/filter, and prevents Coursera deep-linking from being added cheaply. |
| 99 | `/admin/coursera` member dropdown | The "Bind a Coursera learner" member dropdown contains **only one option: "Member Success · member.success@workforceap.org"**. The system has 14 members and `0 mappings / 0 unmatched events`, so 13 unmapped members should be selectable. Either the dropdown is filtered to a fixture/seed only, or member loading is broken. |
| 100 | `/admin/coursera` form fields | None of the four input fields (member select, learner email, actor id, actor home page, notes) have `name` attributes — only placeholders. Form serialization, screen-reader announcement, and any HTML-only fallback all break without `name`. |
| 101 | `/dashboard/training` Mark Complete | Earlier confirmed the API call is `POST /api/member/courses/complete → 200`, but the request body cannot be inspected without DevTools-level network capture. Given #98 (no course IDs in DOM), verify how the server identifies which course to mark — if it's by index in the rendered list, reordering the catalog will silently mis-attribute completions. |

## P1 (round 4) — Other

| # | Page | Issue |
|---|---|---|
| 102 | `/admin` Recent Signups | **Three Michael Brown accounts** in the system, not two as round 1 suggested: `mabrown040@gmail.com` (super-admin / member), `mabrown4@ymail.com` (Pending enrollment), and `mbrowncsn@sbcglobal.net` (AI Professional Practitioner Certificate). All show name "Michael Brown" — admin needs an identity-merge action and the auth flow needs to prevent this fan-out. |
| 103 | `/admin/pipeline` | "Stale Applications" section shows two real entries: "Alec Cargin" + **"Member Success (member.success@workforceap.org) - Applied 4/18/2026"**. The fixture seed used as the prefill in `/admin/coursera` is also a real applicant in the live pipeline. |
| 104 | `/admin/pipeline` Applied column | Includes "Test Member <mbrown@hsconglomerates.com>" alongside real-looking applicants. Explicit test fixture in production pipeline. |
| 105 | `/admin/exports` | **Two `<h1>` "Export Data" elements** on the same page — almost certainly the same desktop/mobile dual-render bug as `/dashboard/training`. |
| 106 | `/admin/board` | **Two `<footer>` elements** on this route (third admin/portal route confirmed leaking the marketing footer; joins `/dashboard/jobs`, `/dashboard/ai-tools`). |
| 107 | `/admin` overview | Recent Signups list rendered **twice**: once as a table with email column, once as a tile list without email. Same content, two layouts, both visible. |
| 108 | header `<button>` semantics | Six buttons in the dashboard chrome have empty `textContent` on the admin page (icon-only). Need `aria-label` audit — visible to screen readers only via aria-label or icon tooltip. |
| 109 | member notification badge label | Member-side bell carries `aria-label`/text "notifications" with no count even when admin shows "1 message SLA breach". The badge value displayed ("1") in the visible corner is not the same source as the panel content ("All caught up"). Two state pipes, no agreement. |

## P2 (round 4) — UX

| # | Page | Issue |
|---|---|---|
| 110 | counselor + partner mobile | Same touch-target compression as member portal at 375px — counselor pages have 5 sub-44px targets, partner has 6. Pattern is global, not per-portal. |
| 111 | `/admin/coursera` workflow | The "Manual identity mapping" form is the *only* mitigation for unmatched xAPI events, but it requires admin to know the Coursera learner email before binding. Add a "match suggested" flow: when an unmatched event lands, show the Coursera email + the closest WAP member by fuzzy email/name match; click-to-bind. |
| 112 | `/dashboard/training` member affordance | After completing a course, no notice / toast / confirmation. State just changes silently. A success toast or animated checkmark would close the loop. |
| 113 | `/dashboard/training` member messaging | Title strip says "Complete your AI Professional Practitioner Certificate courses on Coursera (our online learning partner)." but the integration drops users at coursera.org root or the org admin page. The copy promises a working partner experience the link path doesn't deliver. |

## P3 (round 4) — Documentation / observation

| # | Item | Note |
|---|---|---|
| 114 | xAPI flow | Admin Coursera page describes the matching order: "Manual actor mapping, then manual Coursera email mapping, then direct email match from xAPI Mbox." This is a useful sequence — should be documented in `/admin/coursera` UI alongside an example payload to help admins reason about which step caught a given event. |
| 115 | Coursera org slug | Org slug `workforce-advancement` and program slug `workforce-advancement-project-8a3f0` visible in the launch redirect URL. If these are environment-dependent (staging vs prod), confirm they are in env config and not hard-coded. |

---

## Cross-cutting themes — round 4 additions

- **Coursera integration is half-wired.** The auth/SSO half exists (`/api/member/coursera/launch` returns 302 to a Coursera URL), but: the redirect target is wrong (admin program page, not learner home), per-course links are not deep-linked, course rows carry no Coursera identifier in the DOM, and the admin manual-mapping page only lists one member. Until these are fixed, the "Mark Complete" workflow is the only meaningful surface — and it has no IDs, no toast, and no undo.
- **Fixture data has fully infiltrated production.** `[ARCHIVED FIXTURE]` (member messages), "Test Students" (partner org), "member.success@workforceap.org" (admin coursera + admin pipeline), "Test Member <mbrown@hsconglomerates.com>" (pipeline). One sweep at the data layer — by prefix, by seed flag, or by deletion — removes a class of P1/P2 issues at once.
- **Identity fan-out.** Three Michael Brown member records prove the auth flow does not de-duplicate by name/email. Could affect any admin counselor trying to "find member X" — they'll see multiple options.

---

*Round-4 tooling additions: HEAD/redirect inspection on `/api/member/coursera/launch`, DOM dataset audit on Mark Complete buttons, `name` attribute audit on admin coursera form, admin pipeline + notifications panel content extraction.*

---

## How we'd connect Coursera properly

The current integration is the worst of both worlds: a launch endpoint that doesn't go where it should, per-course buttons that don't deep-link, and a Mark Complete API with no course identifier in the DOM. Below is the approach to fix it once.

### What Coursera actually offers

- **Coursera for Business / Coursera for Government** — the org tier WAP is on. Already provisioned: org slug `workforce-advancement`, program slug `workforce-advancement-project-8a3f0`.
- **Learner-facing program URL** (the right destination for "Open Coursera"): `https://www.coursera.org/programs/<program-slug>`.
- **Stable course URLs** for deep-linking:
  - Single courses: `https://www.coursera.org/learn/<course-slug>` (e.g. `learn/ai-for-everyone`).
  - Professional certificates: `https://www.coursera.org/professional-certificates/<cert-slug>`.
  - Specializations: `https://www.coursera.org/specializations/<spec-slug>`.
- **SAML 2.0 SSO** — single-sign-on so members go from "Open Coursera" → already-authenticated Coursera dashboard. Coursera supports IdP-initiated and SP-initiated flows.
- **xAPI / LRS export** — Coursera enterprise can POST xAPI statements to an external LRS endpoint on every completion. Identity uses Mbox (mailto) + actor object. The admin page confirms WAP is already set up to receive these.
- **Coursera Admin API** — list members, list completions, list courses in a program. Useful for periodic reconciliation and the admin manual-mapping page.

### Target architecture (one cycle to land)

**1. Course catalog as source of truth.**
Every WAP course row needs three Coursera identifiers stored at the data layer:

```
courses table
  - id (uuid)
  - program_id (fk)
  - title (string)
  - coursera_slug (string)             ← e.g. "ai-for-everyone"
  - coursera_url_type (enum)           ← "learn" | "professional-certificates" | "specializations"
  - coursera_xapi_activity_id (string) ← matches xAPI statement.object.id
```

The third field is the bridge between xAPI events and rows — Coursera includes a stable activity URI in every completion statement; storing it lets us update completion without fuzzy matching. For courses already in the DB, backfill via the Coursera Admin API.

**2. Member-facing links.**

- Per-course "Open in Coursera" link (currently `coursera.org/`):
  `https://www.coursera.org/{coursera_url_type}/{coursera_slug}` — opens the specific course.
- Top "Open Coursera" button (currently the org admin page):
  `https://www.coursera.org/programs/workforce-advancement-project-8a3f0` — learner-facing program landing.
- Both should use `target="_blank"` + `rel="noopener noreferrer"` consistently.
- If SSO is wired (next step), wrap each link in the SAML SP-initiated entry so the member lands authenticated.

**3. SSO via SAML.**
WAP issues a SAML assertion → Coursera consumes it → member is logged into Coursera as themselves. Replace the current `/api/member/coursera/launch` redirect with a SAML SP-initiated launch carrying a `RelayState` of the target Coursera URL (program landing, course page, or specialization). One launch endpoint serves every "Open Coursera / Open in Coursera" click.

```
GET /api/member/coursera/launch?target=program
GET /api/member/coursera/launch?target=course&slug=ai-for-everyone&type=learn
GET /api/member/coursera/launch?target=specialization&slug=ibm-ai-engineer
```

Server validates the member's session, builds the SAML AuthnRequest, sends them off with `RelayState=<final coursera url>`. Coursera lands them on the right page logged in.

**4. xAPI ingest at `/api/coursera/xapi`.**
Coursera POSTs statements to a WAP endpoint. For each statement:

```
1. Resolve actor → member:
   a. Manual actor-id mapping (admin coursera page #99/#111)
   b. Manual Coursera-email mapping
   c. Direct email match (statement.actor.mbox → member.email)
   d. Fuzzy match (suggest in admin UI, do not auto-bind)
2. Resolve activity → course:
   a. Match statement.object.id against courses.coursera_xapi_activity_id
   b. If unmatched, surface in /admin/coursera "Unmatched events" with course
      auto-suggestion based on activity title.
3. If both resolved and verb is `completed`:
   - Insert/update course_completions(member_id, course_id, completed_at, source='coursera_xapi')
   - Trigger downstream: certificate eligibility check, weekly recap recompute, counselor notification.
4. Always log the raw statement to xapi_events (idempotent on statement_id).
```

This is the work the admin Coursera page is hinting at — finish wiring it.

**5. Mark Complete becomes the secondary path.**
Once xAPI is reliable, the member-side "Mark Complete" button changes role:

- Default state: hidden / disabled with hover text "Coursera completion will sync automatically within ~1 hour. If it doesn't, click here."
- Click flow: opens a confirmation dialog: "Mark this course complete manually? This is for the rare case where Coursera didn't sync. A counselor will review."
- On confirm: POST `/api/member/courses/complete` with `{ course_id, source: 'self_attestation', reason }`. Insert with `source='self_attestation'` and a `pending_review` flag. Counselor approves or queries the member.
- Show an undo affordance for 30 seconds after click (#4) regardless of source.

This is also where #98 dies: course rows carry `data-course-id` so the click handler doesn't depend on DOM order or innerText.

**6. Admin Coursera page upgrades** (closes #99, #100, #103, #111).

- Member dropdown: list all members not yet mapped (currently lists 1 fixture; should list 14).
- Form inputs: add `name` attributes (`memberId`, `courseraEmail`, `actorId`, `actorHomePage`, `notes`).
- Unmatched events queue: each row shows the raw actor + a "best match" auto-suggestion based on email fuzzy match; click to bind in one step.
- Drop the "Member Success / member.success@workforceap.org" prefill (it leaks into pipeline as a real applicant — #103).

**7. Course catalog admin** (new page or extend `/admin/programs`).
A super-admin can edit a course's `coursera_slug`, `coursera_url_type`, and `coursera_xapi_activity_id` without a code deploy. Backfill the existing catalog using the Coursera Admin API as a one-shot script.

### Sequencing

- **Step A (1 PR, low-risk):** Add `coursera_slug` + `coursera_url_type` columns. Backfill the existing 16-course AI Practitioner catalog by hand or via Coursera Admin API. Update the per-course "Open in Coursera" link to use them. Update the top button to point at the learner program URL. Add `data-course-id` to course rows. Closes #95, #96, #97, #98 (member-side immediately better).
- **Step B (1 PR):** Drop fixture seeds from production data. Closes the leak class (#1, #72, #86, #87, #103, #104).
- **Step C (1 PR):** Admin Coursera page upgrades — full member dropdown, named inputs, unmatched-event auto-suggest. Closes #99, #100, #111.
- **Step D (1 PR):** SAML SSO via the unified `/api/member/coursera/launch?target=…` endpoint. Wraps all the Open-in-Coursera buttons.
- **Step E (1 PR):** xAPI ingest at `/api/coursera/xapi` with the resolution chain above; Mark Complete demoted to self-attestation with counselor review.
- **Step F (1 PR):** Course catalog admin UI for editing slugs without a deploy.

Step A alone unblocks the member-facing experience and is mostly data + a couple of template tweaks. Step E is the structural one — once it lands, training-progress is trustworthy and counselor outreach can fire on real signals instead of self-reported clicks.

---

# Round 5 — Mobile counselor / partner + AI tool mid-flow generation (2026-04-26)

Captured mobile screenshots for 10 counselor + partner routes at 375×812 and ran end-to-end generation on the AI Elevator Speech and Resume Rewriter tools. Numbering continues from #115.

## P1 (round 5) — Bugs

| # | Page | Issue |
|---|---|---|
| 116 | counselor/partner mobile | **Fixed dark bottom-nav overlaps page content.** On `/counselor` mobile the "Good evening, Michael" greeting is visually clipped under the bottom nav; on `/partner` mobile the "review member progress — track their outcomes" copy is clipped the same way; on `/counselor/messages` the footer's "© 2026" line is hidden behind the bottom nav. Bottom nav has higher z-index than content but page content has no `padding-bottom` to compensate. |
| 117 | `/counselor/messages` mobile | Empty-state shows "**No matching members. Try a different search term.**" with the search box empty. The user has not searched — the empty state should read "No members assigned yet" / "Roster is empty" until a query is entered. |
| 118 | `/dashboard/ai-tools/interview-practice` | **Cross-record PII visible in the "Resume context (optional)" textarea.** Logged in as `mabrown040@gmail.com` (super-admin Michael Brown), but the prefilled resume header shows `mabrown4@ymail.com` and a Tulsa, OK address — a different Michael Brown record (#102's ymail account). Pre-fill source is not isolated to the active member's profile. Either real cross-account leak or a side effect of the same super-admin having multiple member records — either way, the pre-fill needs to be sourced from the *current* session's member id, not an ambient lookup. |
| 119 | `/dashboard/ai-tools/elevator-pitch` output | Generated text contains a typo: **"exceling"** instead of "excelling". Either the prompt template, post-processing, or model output drifts on doubled-letter gerunds. Add a quick spell-check pass on AI output before saving / emailing. |
| 120 | `/dashboard/ai-tools/elevator-pitch` history | "Previous AI elevator speeches" section lists results that are **not elevator speeches**: "Career readiness voice coach session", "Career and business coach voice session". Either the history query is unfiltered or the section heading is wrong; pick one. |
| 121 | `/dashboard/ai-tools/resume-rewriter` output | AI response rendered as **raw markdown** (visible `## REPOSITIONED RESUME` heading character) instead of rendered markdown or stripped to plain text. Pick one rendering mode. |
| 122 | `/dashboard/ai-tools/resume-rewriter` salary ranges | Lowest band is **$40,000 - $60,000**. Members from the Digital Literacy program (program metadata states "$38K-$52K" starting salary) have no in-range option to pick. Add an "Under $40,000" band. |
| 123 | `/dashboard/ai-tools/resume-rewriter` resume fetch | `GET /api/member/resume?includePlainText=1` fires **twice** on page load (visible in network log). Double effect or duplicate render. |
| 124 | `/dashboard/ai-tools/resume-rewriter` resume prefill | Notice "Your uploaded resume has been loaded" remains visible after the user replaces the textarea content. State indicator does not reflect the user's edit. |
| 125 | `/partner/referred-members` | "All 1 / Active 1" filter pills both report 1 with the same set, but the member card shows "Alec Cargin / Enrolled 3/20/2026 / **APPLIED**" — **status APPLIED conflicts with an enrolled date**. Either status is stale or the column label is wrong (likely "Referred date" not "Enrolled date"). |

## P2 (round 5) — UX

| # | Page | Issue |
|---|---|---|
| 126 | counselor + partner bottom nav | Counselor has 4 tabs (Overview / Members / Messages / Resources); partner has 5 (Overview / Members / Messages / Milestones / Outcomes). Member portal mobile uses a top-tab strip without a fixed bottom nav. Three different mobile nav patterns across roles — pick one (fixed bottom-nav is good, apply consistently). |
| 127 | `/counselor` mobile | Two welcome strings stacked: "TODAY / You're caught up — nice work" + (clipped) "COUNSELOR DASHBOARD / Good evening, [Michael]". Same drift as member dashboard #29 / #71. Pick one greeting block per page. |
| 128 | `/dashboard/ai-tools/elevator-pitch` post-generate | After generation: pitch displayed, "Copy" + "Edit answers" + "We emailed this to you" + "Start Rehearsal Recording". No primary call-to-action hierarchy — Copy and Edit Answers are equal weight; Start Rehearsal Recording is a secondary block. Decide what the next-best action is and weight it. |
| 129 | `/dashboard/ai-tools/elevator-pitch` email confirmation | "We emailed this AI elevator speech to you so you can review it later." rendered as static text — no toast, no email-status feedback (sent vs. queued vs. failed). Treat as a confirmation event with a state. |
| 130 | `/dashboard/ai-tools/resume-rewriter` workflow card | Above the form, a "Dedicated voice flow → Open Resume Coach" card promotes the alternate tool. Useful for discovery, but it lives inside the rewriter form and competes with the primary action. Consider moving to a sibling section or a single tab control "Text rewrite | Voice coach". |

## P3 (round 5) — Microcopy

| # | Page | Issue |
|---|---|---|
| 131 | `/dashboard/ai-tools/resume-rewriter` | "How this works: Tell us your career goal — we'll reposition your existing experience to match. **We don't invent anything.** Every bullet in the output comes from what you've actually done." Strong copy, but the model can still hallucinate (#119). Either harden the post-processing to enforce the promise or soften the absolute claim. |
| 132 | `/dashboard/ai-tools/elevator-pitch` | Output begins with `"I am Test User, a skilled..."` — opens with smart quotes embedded in the speech itself. If a member literally reads it, they will say "open quote, I am…". Strip leading/trailing quotes from the spoken copy or render in a quoted card without putting the quote characters into the text the member rehearses. |

## P4 (round 5) — Visual

| # | Page | Issue |
|---|---|---|
| 133 | `/counselor` mobile | "TODAY" eyebrow + bold greeting card has rounded pink border that visually competes with the KPI card (Needs reply / At risk of ghosting / Interviewing this week) immediately below. Two outlined cards stacked with no spacing rhythm. |
| 134 | `/partner` mobile | KPI cards stack vertically, each ~50px tall on a tall column. Could be 2×2 grid or pill row at mobile to reclaim vertical space. |

---

## Cross-cutting themes — round 5 additions

- **Mobile bottom-nav vs main-content layering.** Counselor and partner both deploy a fixed dark bottom nav, and both clip the page content. Add `padding-bottom: var(--mobile-nav-height)` to the content area or position the bottom nav as a flex sibling.
- **PII fan-out at the prefill layer.** Three Michael Brown records (#102) means any "load my resume / load my profile" prefill that joins by name fan-outs across records. The Interview Practice prefill (#118) is the canary. Audit every prefill source to ensure it scopes by the current session's member id, not a fuzzier match.
- **AI output post-processing is missing.** Spell-check (#119), markdown rendering (#121), quote-stripping (#132) — three different cosmetic issues from one missing post-process layer. Build a small utility that wraps every AI completion before it hits the UI.

---

*Round-5 tooling additions: end-to-end generation for AI Elevator Speech (`POST /api/ai/elevator-pitch → 200`) and Resume Rewriter (`POST /api/ai/resume-rewriter → 200`); mobile screenshot capture for 10 counselor + partner routes; cross-portal mobile-nav comparison.*

---
