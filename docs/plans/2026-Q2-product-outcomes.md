# Q2 product outcomes — member-led growth

This turns the earlier strategy conversation into **one primary persona**, **three measurable outcomes**, and **concrete surfaces in this repo** (no net-new pillars).

## Primary persona (Q2)

**Active enrolled member** (has chosen or is choosing a program) — optimizing for **completion → job search → placement**, because that is what funds retention and partner trust.

## Three outcomes (how we’ll know it’s working)

| Outcome | Metric (initial) | Where we measure / instrument |
|--------|-------------------|-------------------------------|
| **1. Fewer “stuck” members** | ↑ Weekly active members who complete **one** meaningful action (assessment step, resume upload, tracker row, or counselor reply thread) | `member_events` / existing funnel events (`member_dashboard_action_clicked`, etc.); weekly recap JSON |
| **2. Clearer next step** | ↑ Click-through from dashboard **“Your next steps”** to linked routes; ↓ single-session bounce from `/dashboard` | New cards link to `/apply`, `/dashboard/program`, `/dashboard/assessment`, `/dashboard/messages`, `/dashboard/resume`, `/dashboard/job-applications`, `/dashboard/profile`, `/dashboard/weekly-recap` — add analytics labels in a follow-up |
| **3. Faster counselor loop** | Median time to **first counselor response** after member message (baseline, then improve) | `message_threads` + `messages` timestamps (counselor workflow already partially surfaced on counselor home) |

## What we shipped in code (this pass)

| Piece | Role |
|-------|------|
| `lib/member/nextBestActions.ts` | Priority rules for nudges (pure logic, easy to tune) |
| `lib/member/memberEngagementSignals.ts` | Resume presence, application tracker count, counselor unread, weekly recap opened |
| `components/portal/MemberNextStepsStrip.tsx` | Dashboard UI for up to four cards |
| `app/(portal)/dashboard/page.tsx` | Wires signals + `getProfileCompleteness` into `buildNextBestActions`; mobile + desktop |

## Next bets (not blocking launch)

- **Counselor work queue** — “needs reply in 48h” sorted list (reuse `message` / thread queries like counselor home).
- **Admin cohort export** — placement + wage fields you already store, one CSV from `/admin/programs` or reporting page.
- **Event labels** — `next_step_click` with `action_id` on each card for clean funnel reporting.

## Related docs

- Sprint tracker: [`2026-04-03-sprint-tracker.md`](2026-04-03-sprint-tracker.md)
- Separate engineering tracks: [`SEPARATE-SPRINTS.md`](SEPARATE-SPRINTS.md)

*Last updated: 2026-04-04.*
