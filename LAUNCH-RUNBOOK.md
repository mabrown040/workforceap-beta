# LAUNCH RUNBOOK — May 1, 2026

WorkforceAP cohort 1 launch.  Today is **2026-04-26 (T-5 days)**.

This runbook covers what has to be true before launch, on launch day, and the first 7 days after.  Organized by **audience** so the right person checks the right path.  Items are tagged with **owner** (👨 Mike, 👴 Dad/lead counselor, 🏛 admin/ops) and **timing** (T-5 / T-1 / T-0 / T+1d / T+7d).

If you're skimming, the most likely launch-killers are flagged 🔴.  Do those first.

---

## 0 — Infrastructure & environment 🔴

These have to be true before anything else matters.  Every single AI feature, voice agent, and email path depends on these.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | **T-5** | 🔴 `ANTHROPIC_API_KEY` set in **Vercel prod** | Vercel → Project → Settings → Environment Variables → filter "ANTHROPIC" → confirm Production scope | Key present, length matches `sk-ant-...` |
| 👨 | T-5 | 🔴 `GROQ_API_KEY` set in Vercel prod | same | Present (multi-provider AI fallback) |
| 👨 | T-5 | 🔴 `GEMINI_API_KEY` set in Vercel prod | same | Present (multi-provider AI fallback) |
| 👨 | **T-5** | 🔴 `ELEVENLABS_API_KEY` set in Vercel prod | same | Present (powers all voice agents) |
| 👨 | T-5 | All 8 ElevenLabs agent IDs set | filter "ELEVENLABS_*_AGENT_ID" — interview, counselor, employer, partner, readiness, resume_coach, wioa_prequal, career_business | All 8 present (or fallbacks in code will be used) |
| 👨 | T-5 | `RESEND_API_KEY` set in Vercel prod | same | Present (powers all transactional email) |
| 👨 | T-5 | `DATABASE_URL` / `DIRECT_URL` Supabase prod | same | Present, not pointing at local |
| 👨 | T-5 | Domain `workforceap.org` resolves with valid SSL | `curl -I https://www.workforceap.org` | 200 OK, valid cert |
| 👨 | T-5 | Sentry or error tracking enabled in prod | `app/(...)/layout.tsx` or sentry config | Receiving events |

---

## 1 — Member (the cohort, ~12 people) 🔴

The cohort is THE actual user.  These flows have to work end-to-end on **prod**, not staging.

### 1a. Sign-up + onboarding path 🔴

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | **T-1** | 🔴 New cohort member can hit `/apply` and complete onboarding | Open `/apply` in incognito, fill the form with a test email | Lands on `/apply/confirmation`, receives email |
| 👨 | T-1 | 🔴 Confirmation email sends + arrives | Check the test inbox | Email received within 60s, brand layout correct |
| 👨 | T-1 | WIOA prequal voice agent loads | `/wioa-qualification` → start voice session | ConvAI signed URL granted, agent speaks |
| 👨 | T-1 | WIOA prequal text fallback works | Same page, switch to text input | Form submits, response saved |
| 👨 | T-1 | Sign-in via emailed magic link works | Click link in welcome email | Lands authenticated on `/dashboard` |

### 1b. Member /dashboard 🔴

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | 🔴 `/dashboard` renders for a real cohort member | Sign in as one of the 12 cohort emails | No 500, hero greeting, priority action card visible |
| 👨 | T-1 | "Your in-office session" card renders if a session was run | Run a session as counselor first, then sign in as member | Card shows actor + date + tool count |
| 👨 | T-1 | Mobile dashboard renders at 375px | Resize browser or use DevTools device mode | Hero, KPIs, navigation all touch-friendly |

### 1c. AI tools (the differentiator) 🔴

This is the feature set that defines the product.  Each must be exercised on **prod**.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | **T-1** | 🔴 Resume rewriter returns real output | `/dashboard/ai-tools` → resume rewriter, paste sample, click Build | Returns rewritten resume in <30s, no error toast |
| 👨 | T-1 | 🔴 Cover letter returns real output | Same area, cover-letter tool with JD | Returns letter in <30s |
| 👨 | T-1 | 🔴 Interview practice returns questions | Same area, interview tool | Returns 5-6 questions in <30s |
| 👨 | T-1 | Voice mock interview signs in | `/dashboard/ai-tools/mock-interview` → click start | ConvAI session opens, agent speaks |
| 👨 | T-1 | Career business coach voice works | `/dashboard/ai-tools/career-business-coach` → start | ConvAI session opens |
| 👨 | T-1 | Readiness voice coach works | `/dashboard/ai-tools/career-readiness` (or equivalent) | ConvAI session opens |

**If any AI tool fails:** check Vercel function logs for the route (`/api/ai/resume-rewriter`, etc.).  Most likely cause is a missing API key (see §0).

### 1d. Job board + Apply Loop

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | Job board renders (member view) | `/dashboard/jobs` while signed in | Job cards display, age-gated correctly |
| 👨 | T-1 | "Log external application" button works | Header button → fill form → submit | Modal closes, application appears in list, counselor thread shows note |
| 👨 | T-1 | Apply to internal job works | Click a job → Apply | Application created, status reflects |

### 1e. Messaging

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | Member can send a message to counselor | `/dashboard/messages` → compose | Counselor receives, SLA timer starts |
| 👨 | T-1 | Mobile messages page renders | Resize to 375px | Inbox split-pane works (now that #752 fixed responsive variants) |

---

## 2 — Counselor (👴 Dad + lead counselors) 🔴

Your dad is the second most important user.  His day-1 path is **load Command Center → run a walk-in session → email packet → repeat**.

### 2a. Counselor Command Center 🔴

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | **T-1** | 🔴 `/counselor` loads as Command Center | Sign in as dad's account | Three sections render: Needs Reply / At Risk / Interviewing |
| 👨 | T-1 | "At risk" daysInactive shows real values | If members have been inactive | Days reflects real `MAX(created_at)` from member_events (fixed in #747 hot-fix) |
| 👨 | T-1 | Click-through to member detail works | Click any name in any section | Lands on `/counselor/students/{id}` |

### 2b. In-office session — existing member path 🔴

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👴 | **T-1** | 🔴 Start session for an existing member | `/counselor/sessions` → pick a member → Start session | Lands on `/counselor/sessions/{cid}/run?sid=...` |
| 👴 | T-1 | 🔴 Voice walk-through agent connects | Click "Use voice" on the walk-through card | ConvAI session opens, agent introduces itself with member's name |
| 👴 | T-1 | 🔴 Per-card voice agents work | Click "Use voice" on Resume / Cover / Interview cards | Each opens its own voice session with prior context threaded |
| 👴 | T-1 | 🔴 All 3 AI tools run on-behalf-of | Fill forms, click Build resume / Build cover letter / Generate questions | Each returns real output, saves to MEMBER history |
| 👴 | **T-1** | 🔴 End session emails packet | Click "End session & email packet" | Member's email receives packet within 60s, contains all 3 outputs |

### 2c. In-office session — walk-in path 🔴

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👴 | T-1 | 🔴 Walk-in creates a real account | `/counselor/sessions/walk-in` → fill name + email + phone | Account created, redirected to session run page |
| 👴 | T-1 | "Account created" banner shows on session page | Same flow | Banner mentions email + "End session" CTA |
| 👴 | **T-1** | 🔴 End session sends welcome email + packet | Click End session | New member receives both emails (welcome with magic link + packet) |
| 👴 | T-1 | New member can sign in via magic link | Click link in welcome email | Authenticated, sees `/dashboard` with their session card |

### 2d. Counselor messaging

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👴 | T-1 | `/counselor/messages` inbox renders | Sign in as dad | Threads listed, unread badge accurate |
| 👴 | T-1 | SLA badge shows correctly | Look at any thread > 24h old | "48h response" badge if actually breaching, not 24h tip |
| 👴 | T-1 | Reply sends to member | Click thread, type reply, send | Member receives in `/dashboard/messages`, email notification (if enabled) |

---

## 3 — Partner (community orgs that refer members)

Currently invitation-only — only users with a `PartnerUser` row see `/partner`.  No public marketing page.  **Decision still open: do you want a tighter `active` flag on `Partner`?**  If not, this section just verifies the existing partners can do their job.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | A test PartnerUser can sign in to `/partner` | Sign in as a known partner email | Lands on partner dashboard, no redirect |
| 👨 | T-1 | Referral link renders + copies | Open partner dashboard | Link visible, copy button works |
| 👨 | T-1 | Recent referred members list renders | Same page | List shows real referred members or empty state |
| 👨 | T-1 | Mobile partner dashboard renders | Resize to 375px | Mobile section renders, KPIs visible (now that #752 fixed responsive) |
| 👨 | T-1 | Desktop partner dashboard renders | Full desktop | PageHeader, voice agent surface, referral panel all visible (this was the bug fixed by #752) |

---

## 4 — Employer (hiring partners — waitlist mode)

`/employers` is in waitlist mode for launch.  Full employer onboarding is post-cohort-3.  Verify the waitlist contact path works and the existing portal still accepts invited employers.

### 4a. Public `/employers` page

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | Page renders with waitlist banner | Open `/employers` in incognito | Crimson "Hiring partner waitlist · Pre-launch" banner at top |
| 👨 | T-1 | Hero H1 renders at 72px on desktop | Visual check at 1440px | "Hire Certified, Job-Ready Talent" |
| 👨 | T-1 | "Join the waitlist" CTA works | Click → scroll to contact form | Form visible, submit button enabled |
| 👨 | T-1 | Contact form submits | Fill + submit | Returns success message, no console errors |

### 4b. Authenticated `/employer` portal (for invited employers)

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | Invited employer can sign in | Sign in as a known employer email | Lands on `/employer` dashboard |
| 👨 | T-1 | Mobile h1 renders at the hero (#753) | Resize to 375px | "N candidates waiting" or "Your talent pipeline" as h1 |
| 👨 | T-1 | Job posting form works | `/employer/jobs/new` → fill → submit | Job created, status pending |

---

## 5 — Workforce board buyer demo 🔴

This is THE SaaS pitch surface.  When a board demos this on May 1, they should leave wanting to talk.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | **T-1** | 🔴 `/admin/board` loads + renders | Sign in as admin | Page renders, no 500 |
| 👨 | T-1 | 🔴 Pilot-phase banner shows + reads as intentional | Look at top of page | Blue "Pilot phase · N members served" banner + adaptive copy (#755) |
| 👨 | T-1 | KPI cards render even with 0 placements | Visual | "Members served" shows real count, "Placement rate: 0%" shows but is now contextualized by the banner |
| 👨 | T-1 | Period switcher works | Click All time / YTD / This quarter | URL updates, data filters correctly |
| 👨 | T-1 | Demographics chart shows real WIOA categories | Scroll down | Bars for veteran/employment/income/education/ethnicity |
| 👨 | T-1 | "Generate funder report" prints | Click button → `/admin/board/print` | Print-friendly version renders, ready for save-as-PDF |
| 👨 | T-1 | Print version does NOT show the pilot banner | `/admin/board/print` directly | (verify decision in PR #755 — banner only on live view) |

**Buyer-demo dry run:**  👨 spend 10 minutes pretending to be a workforce-board director seeing this for the first time.  Where does your eye go first?  What question do you want to ask?  Iterate copy before May 1.

---

## 6 — Admin / operations (👨 Mike + 🏛 ops)

Day-1 admin is invitations, monitoring, and reading the dashboards.  Plus emergency access.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-1 | `/admin` overview renders | Sign in as admin | Pending applications, SLA breaches, cron errors visible |
| 👨 | T-1 | Sidebar shows ONE "In-office sessions" entry | Look at left nav (#751 fixed dup) | Single entry under Workflows group |
| 👨 | T-1 | `/admin/ai-tools` chart renders | Open page (#751 fixed empty state) | Either real cohort data OR a clear empty-state card explaining the situation |
| 👨 | T-1 | `/admin/members` list loads | Open | All cohort members listed, can click into each |
| 👨 | T-1 | `/admin/invites` works for sending cohort welcomes | Open | Existing invites visible, send-new flow works |
| 👨 | T-1 | `/admin/diagnostics` and `/admin/email-crons` health-check | Open both | No red flags, recent crons green |
| 👨 | **T-1** | 🔴 Send a real cohort welcome email and confirm receipt | Trigger from invite flow | Member receives welcome, magic link works |
| 👨 | T-1 | `/admin/exports` runs a CSV without timing out | Click any export | Downloads within 30s |

---

## 7 — Public marketing pages

The pages anyone can hit without logging in.  These set first impressions for board buyers, mentors, employers, partners.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-2 | `/` homepage renders cleanly on desktop + mobile | Both viewports | Hero, programs, footer all visible, no layout breaks |
| 👨 | T-2 | `/programs` lists all current programs (no dupe Security+ — fixed in #731) | Visual scan | Each program has distinct title + descriptor |
| 👨 | T-2 | `/employers` (waitlist mode) renders | See §4a |
| 👨 | T-2 | `/mentor` (waitlist mode) renders with new clamp() H1 (#753) | Visual at 1440px | H1 ~56px, both Apply CTAs use `btn` styling |
| 👨 | T-2 | `/about`, `/contact`, `/wioa-qualification` all 200 | Hit each | No 500s, no broken images |
| 👨 | T-2 | `robots.txt` is correct for prod | `https://www.workforceap.org/robots.txt` | Allows crawling of public routes, disallows `/admin`, `/api`, `/dashboard` |
| 👨 | T-2 | `sitemap.xml` covers all public routes | `https://www.workforceap.org/sitemap.xml` | Includes `/`, `/programs`, `/employers`, `/mentor`, `/wioa-qualification`, etc. |

---

## 8 — Mobile + accessibility

The cohort is most likely to hit the portal on phones.  Most launch-day failures here are dormant CSS.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-2 | `/dashboard` on iPhone (or 375px mobile DevTools) | Sign in as member, mobile view | Hero, priority action, AI tools all touch-friendly, bottom nav visible |
| 👨 | T-2 | `/counselor/messages` on mobile | Sign in as counselor, mobile view | Inbox renders correctly (this was hidden by `wa-md:` bug — fixed in #752) |
| 👨 | T-2 | `/partner` on desktop AND mobile | Sign in as partner | Both layouts render (also fixed in #752) |
| 👨 | T-2 | All forms have label-for/id bindings (#733) | Tab through `/apply`, `/login`, profile edit | Each form field reads its label when focused |
| 👨 | T-2 | Every page has exactly one h1 per viewport | Use a a11y extension (axe DevTools) on `/dashboard`, `/counselor`, `/admin/board`, `/employer`, `/partner`, `/dashboard/mentor` | One h1 per viewport (these were audited and fixed in #753, #754) |

---

## 9 — Email deliverability

If welcome emails or session packets land in spam, the launch is broken even if the app works.

| Owner | Timing | Item | How to verify | Pass |
|---|---|---|---|---|
| 👨 | T-3 | SPF, DKIM, DMARC for `workforceap.org` | DNS records or Resend dashboard | All three published |
| 👨 | T-3 | Test email to Gmail, Outlook, Yahoo lands in inbox | Send a test welcome to one of each | None go to spam |
| 👨 | T-3 | Email sender domain isn't `noreply@onresend.dev` | Look at "from" field of test email | Branded sender (e.g. `welcome@workforceap.org`) |
| 👨 | T-3 | Session packet email renders correctly on Gmail web + Outlook web + iPhone Mail | Send packet to test inboxes on all three | Layout, gradient, and links all render |

---

## 10 — Launch day (T-0, May 1)

| Owner | Timing | Item |
|---|---|---|
| 👨 | T-0 morning | Pull `git log master --oneline --since=yesterday`; confirm no surprise late changes |
| 👨 | T-0 morning | Run §0 spot-check: hit each AI tool once on prod |
| 👨 | T-0 morning | Send a test session packet to your own email — eye-check the layout |
| 👴 | T-0 morning | Sign in to `/counselor` and bookmark Command Center |
| 👨 | T-0 | Be on call in Slack/text for the first 4 hours after first cohort member arrives |
| 👨 | T-0 | If anything goes 500: Vercel logs first, Sentry second, then triage |
| 👨 | T-0 evening | Hit `/admin/board`, screenshot the pilot-phase banner — establish baseline for week-1 metrics |

---

## 11 — Post-launch (T+1 day, T+7 days)

| Owner | Timing | Item |
|---|---|---|
| 👨 | T+1d | Pull error count from Sentry — anything new since launch? |
| 👨 | T+1d | Check `/admin/email-crons` — every cron green for the last 24h? |
| 👨 | T+1d | Check `/admin/ai-tools` chart — at least one cohort member ran a tool? |
| 👨 | T+1d | Send dad a "how did day 1 feel" check-in |
| 👨 | T+7d | Compare `/admin/board` week-1 metrics to T-0 screenshot — see motion |
| 👨 | T+7d | Triage waitlist signups (`/employers` + `/mentor`) — schedule follow-ups |
| 👨 | T+7d | Open follow-up issue: rip out the pilot-phase banner once `membersPlaced ≥ 5` (auto-hides, but worth visual confirmation) |

---

## Known issues / deliberately-deferred (do NOT fix in flight)

- **Multi-tenant board auth** (Task 8 in original plan) — white-label SaaS feature.  Not needed for nonprofit pilot.  Defer to post-cohort-3.
- **Partner gating tier system** — currently invitation-only via `PartnerUser` row.  Decision still open whether to add an `active` flag on `Partner`.  Won't block May 1.
- **`memberNextBestAction` Prisma errors in `tsc --noEmit`** — pre-existing, due to model not yet generated.  Run `prisma generate` if it actually breaks builds; otherwise non-blocking.

---

## When in doubt

- **Logs:** Vercel → Project → Functions → pick the failing route
- **Errors:** Sentry → search by route or user
- **DB:** Supabase → SQL Editor — `SELECT * FROM auth.users WHERE email = '…'` to confirm an account exists
- **Email:** Resend → Logs — search by recipient
- **Voice:** ElevenLabs → ConvAI → check signed-URL minting for the failing agent

If the runbook gets out of sync with the app, **trust the app, fix the runbook**.
