# Portal UI — Decision mockup (WAP 2.0)

**Purpose:** One place to *see* the reskin direction, compare it to today, and decide what to ship.
**Audience:** Mike (sign-off), Cursor agents (implementation reference).
**Last captured:** 2026-06-22 from Vercel preview (`feature/portal-design-system`).

---

## Open these three URLs (preview)

Replace `{preview}` with the current branch alias, e.g.
`https://workforceap-beta-git-feature-p-793c79-mabrown040-5207s-projects.vercel.app`

| # | URL | What it shows | Use when |
|---|-----|---------------|----------|
| **A** | `{preview}/dev/dashboard` | **Target mock** — full member home with *representative* data (78% AWS, jobs, streak). No login. | “Is this the vibe?” |
| **B** | `{preview}/dev/kit` | **Component library** — every kit primitive in `warm` + `dense` surfaces. | “Do the parts feel right?” |
| **C** | `{preview}/en/dashboard?ui=kit` | **Real wiring** — same kit fed by demo DB (sign in first). | “Does real data break the layout?” |

**Demo login (for C):** `demo-member@workforceap.org` / `Demo2026!`

**Screenshot on disk:** `public/.qa/portal-mockup/wap2-member-dashboard.png` (captured from A).

---

## What you're choosing (not three random skins)

We already locked **one hybrid system** — not Calm vs Dense vs Bold as separate products:

```
┌─────────────────────────────────────────────────────────────┐
│  WAP 2.0 = Gold × Stat-Dense (token-driven hybrid)          │
├─────────────────────────────────────────────────────────────┤
│  Member surfaces     →  warm  (Bold hero + Calm next-step)   │
│  Staff/admin surfaces →  dense (command center, tables)     │
│  Same components     →  data-surface="warm|dense" on shell  │
└─────────────────────────────────────────────────────────────┘
```

The lab HTML concepts (`workforceap-concept-calm/dense/bold.html`) were **exploration**; production code follows the table in `docs/PORTAL_REDESIGN_PLAN.md` §1.

---

## Member dashboard — layout mock (target = URL A)

```
┌─ AppShellMember ─────────────────────────────────────────────┐
│ [Journey] [Program] [Jobs] [Me]     🔥12-day  🪙1,240  [MB] │
├──────────────────────────────────────────────────────────────┤
│ ┌─ gradient hero (crimson) ─────────────────────────────────┐ │
│ │  (78%)   Keep climbing, {name}.                           │ │
│ │  ring    You're 78% to your AWS cert — one module…        │ │
│ │          [ Resume module ]                                 │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   KPI strip              │
│ │Course│ │ Jobs │ │Certs │ │Points│                           │
│ └──────┘ └──────┘ └──────┘ └──────┘                           │
│ ┌─ Do this next (single calm card) ─────────────────────────┐ │
│ │ → Shared Responsibility Model · ~25 min                     │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌ Career Toolkit ┐ ┌ Next Badge ┐ ┌ Learning Hub ┐  bento   │
│ ┌─ Program progress bar ────────────────────────────────────┐ │
│ ┌─ Job pipeline table (cards on mobile) ─────────────────────┐ │
└──────────────────────────────────────────────────────────────┘
│ [Journey] [Program] [Jobs] [Me]              bottom tabs (mobile)
```

**Code:** `app/dev/dashboard/page.tsx` = full mock · `MemberDashboardKit` = production component behind `?ui=kit`.

---

## Current vs WAP 2.0 (honest diff)

| Area | Today (prod default) | WAP 2.0 kit |
|------|----------------------|-------------|
| Member nav | Left sidebar + many links | Top tabs + bottom bar (4 pillars) |
| Home hero | Text blocks / scattered CTAs | Crimson gradient + progress ring |
| Density | Mixed legacy portal CSS | Tokenized `wa-kit-*` cards |
| Staff portals | Unchanged in Phase 1 | Phase 2+ on `dense` surface |
| Data | Full `renderMemberDashboard` pipeline | Lean path for `?ui=kit` on preview |

**Gap today:** URL C shows **0%** for `demo-member` because seed data isn't enrolled like Jordan Williams in the story mock. URL **A** is the visual target until demo seed catches up.

---

## Sign-off checklist (Mike)

Use this when you're ready to flip `?ui=kit` → default on member dashboard:

- [ ] **Hero + ring** — motivational without feeling gamified / cheesy
- [ ] **KPI strip** — 4 stats feel useful (not dashboard clutter)
- [ ] **“Do this next”** — one clear action beats a tool dump
- [ ] **Nav simplification** — Journey / Program / Jobs / Me vs full sidebar
- [ ] **Mobile** — bottom tabs usable one-handed (resize preview or phone)
- [ ] **Brand** — crimson `#ad2c4d` + gold `#a47f38` still feel like WorkforceAP
- [ ] **Real data** — re-test C after `db:seed:demo` with enrolled member

**If yes on 5+:** approve Phase 1 flip (remove `?ui=kit` gate on dashboard).
**If no on nav or hero:** say which section — we adjust tokens/components, not a full redesign.

---

## Still open (not blocking the mock)

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Pooler / 504 | `PRISMA_FLATTEN_TX` on preview vs session pooler `:5432` | Session pooler for durable fix |
| Sidebar on kit dashboard | Legacy `(portal)` layout still shows full sidebar on C | Hide legacy nav when `ui=kit` (follow-up) |
| Admin Phase 2 | Command center on `dense` | After member sign-off |

---

## For Cursor agents

When implementing portal UI work:

1. Read **`docs/PORTAL_REDESIGN_PLAN.md`** (rollout) + **`docs/PORTAL_DESIGN_KIT.md`** (component contracts).
2. Match **`/dev/dashboard`** visually — that's the approved mock.
3. Use **`components/portal/kit/*`** — do not fork one-off styles on portal pages.
4. Test on preview with demo Supabase; never prod for reskin QA.
