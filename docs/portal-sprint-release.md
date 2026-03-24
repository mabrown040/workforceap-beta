# Portal selective-expansion sprint (merged)

**Merge commit (master):** `1598752`  
**Feature commits:** `062d547` (P0), `a169e6f` (P1 + artifact)

Full checklist, migrations, and validation: `artifacts/stage-2-5-cursor-prompt.md`

**Deploy:** run `npm run db:migrate:deploy` (includes `20260324120000_portal_workflow_events` and prior outreach migration if missing).

---

## P0/P1 portal UX sprint (branch `fix/p0-p1-portal-ux-mar26`)

**Commits:** `bb99a3b` (P0), `a7a733f` (P1), and a follow-up commit on the same branch updating this file with QA notes.

### Verification (local)

**Recorded run (2026-03-23):** `npx tsc --noEmit` — pass; `npm run test:unit` — pass (8 tests); `npm run build` — exit 0 with expected Prisma `127.0.0.1:5432` unreachable warnings during static generation.

### Before / after QA (manual)

| Route | Before | After |
| ----- | ------ | ----- |
| `/portal` | 404 | 302 to `/login` (portal chooser + sign-in) |
| `/contact` | Server errors only; generic invalid state | Field-level errors before submit; 429 stays on page with explicit rate-limit copy |
| `/apply` (step 1) | Short labels; hint only on blocked continue | Full eligibility prompts; per-question inline error text |
| `/programs` | Grid `minmax(350px)` could feel tight with dense meta row | `minmax(min(100%,320px),1fr)` + stacked duration/salary row ≤480px |
| `/dashboard` | (unchanged behavior) | Member shell unchanged; mobile portal header uses single menu control (drawer) |
| `/employer/jobs` | Filters could wrap awkwardly; main area could clip in flex | `min-width:0` on shell inner + page; horizontal scroll filters on small screens |
| `/employer/settings` | Thin support blurb | “What you can do now” list with links to jobs, applications, messages, contact |

### Risks

- Eligibility copy is longer on small screens; confirm wrapping in real devices.
- Hiding `PortalHeaderActions` hamburger ≤639px assumes sidebar footer actions are sufficient (matches current shell design).
