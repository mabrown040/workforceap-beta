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
