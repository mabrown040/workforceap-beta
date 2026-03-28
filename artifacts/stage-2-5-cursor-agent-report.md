# Stage 2–5 Rollout Report — Cursor Agent (workforceap-beta)

**Date:** 2026-03-22  
**Repo:** `C:\Users\mabro\.openclaw\workspace\projects\workforceap-beta`  
**Branch:** `master`  
**Source prompt:** `artifacts/stage-2-5-cursor-prompt.md`

---

## Executive summary

- **Stage 2 (copy audit):** Public employer/partner marketing surfaces reviewed in-repo show **no employer-facing “free job posting” / “post a job (free)” style wording**. No launch-alignment code edits were required for this objective.
- **Stage 3 (local verification):** The agent **attempted** to run `npm run test:unit` and `npm run build`, but **this session’s terminal integration did not execute commands with observable side effects** (commands returned immediately with no stdout/stderr and did not create log files when redirected). **An operator must run the two commands locally** and treat their output as authoritative for this rollout gate.
- **Stage 4 / 5 (git):** **No commit and no push** — working tree was already aligned with Mike’s stated objective; a no-op commit was explicitly disallowed when no changes are needed.

---

## Current git pointer

| Item | Value |
|------|--------|
| **`master` HEAD** | `4a4c46dffa71a9c3c3f802aa06d66b7b5d7aa061` |
| **Branch tracking** | `master` is configured to track `origin/master` (per `.git/config`) |
| **Push status** | **Not verified in this session** (no reliable shell output / `git fetch` was not observable). After local verification, run `git status -sb` and `git log origin/master..master` (or equivalent) on your machine to confirm whether `master` is ahead of `origin/master`. |

---

## Stage 2 — Employer “free” job-posting wording audit

### Scope (as interpreted)

- **In scope:** Public routes and shared chrome that an employer or partner sees **before** signing in — especially `/employers`, `/partners`, homepage employer messaging, `/jobs`, nav labels visible when logged out, and related metadata where it markets to employers.
- **Out of scope (per prompt):** Participant/member “no cost” / “free training” messaging; protected lines such as **“$0 Cost to Qualifying Participants”**; portal-only copy (`app/(portal)/employer/*`, authenticated flows); internal artifacts and planning docs unless they are the live site.

### Method

- Ripgrep over `app/**/*.tsx` (and targeted `components`) for patterns including: `free` + `job`/`post`, `(Free)`, `free posting`, `post a job (free)`, and manual reads of `app/employers/page.tsx`, `app/partners/page.tsx`, `app/page.tsx` (employer card + CTAs), `app/jobs/*`, `components/MainNav.tsx`, `components/Footer.tsx`.
- **Excluded** `node_modules` by not searching there.

### Findings — public marketing

| Surface | Result |
|---------|--------|
| **`/employers`** (`app/employers/page.tsx`) | Primary CTA is **“Post a Job”** (no “free”). Partnership tier **“Job Postings”** lists features (**“Post unlimited jobs”**, etc.) with **no price / “free”** language. **“No placement fees”** appears in “How it works” (fee framing, not “free posting”). |
| **`/partners`** (`app/partners/page.tsx`) | Employer blurb: **“Post jobs and become a hiring partner…”** — no “free posting.” Occurrences of **“free”** refer to **referral cost** and **free career training for candidates** (member/referral channel), not employer job posts. |
| **Homepage** (`app/page.tsx`) | Employer card: **“Post roles…”** — no “free” for employers. **“$0 Cost to Qualifying Participants”** and no-cost member journey copy preserved (participant side). |
| **`/jobs`** | Copy describes partner-posted roles; **no** “free posting” for employers. |
| **`MainNav`** | Standard labels; **no** employer “free posting” CTA. |
| **`Footer`** | **“Free career training…”** — participant/public program framing, **not** employer job-posting. |

### FAQ / other public routes

- **`app/faq/FAQContent.tsx`** includes **“free training with job placement”** in a **member skepticism** answer — it describes **training**, not **employer job posting pricing**. Treated as **in scope for participants**, not an employer marketing regression for this rollout.

### Portal entry (logged-out)

- **`app/(auth)/login/LoginForm.tsx`** describes employer login as **“Job postings, … hiring workflows”** — **no** “free.”
- **`lib/nav/workspaceCopy.ts`** **`Post a job`** is **inside the employer workspace** after auth — not a public marketing surface for this audit.

### Stale references outside the app (informational)

These are **not** user-facing production routes but can confuse operators:

- `docs/VERIFICATION-PUBLIC-TRUST-REVENUE-10-STAR.md` still lists CTAs including **“Post a Job (Free)”** — **does not match** current `app/employers/page.tsx` (which uses **“Post a Job”** without “Free”).
- `artifacts/workforceap-sdr-targeting-2026-03-22.md` contains internal GTM language about **“free job posting”** for employers — artifact only.

**Recommendation (non-blocking):** Update internal docs when convenient so they match production copy; not required to satisfy “public marketing surfaces” if the live app is correct.

### Note on prompt vs. current homepage hero

- `artifacts/stage-2-5-cursor-prompt.md` lists a protected homepage hero headline: *“Breaking systemic barriers through education, technology, and opportunity.”*
- **Current** `app/page.tsx` hero title is **“Empowering People. / Advancing Futures.”** with a **“No-cost training for qualifying participants”** badge.
- This is **outside** the Stage 2 “remove free job-posting wording” task and was **not changed** here. If the prompt’s protected headline is still a hard requirement, that would be a **separate product/copy decision**, not part of this rollout verification.

---

## Stage 3 — Commands requested and execution status

### Required commands (from prompt)

1. `npm run test:unit` — runs `node --import tsx --test lib/**/*.test.ts` (see `package.json`).
2. `npm run build` — runs migrate helper + Prisma generate + `next build`.

### What happened in this agent session

- Multiple shell invocations (`git`, `npm`, `node -e`, file redirects) **did not produce captured stdout/stderr** and **did not create expected output files** on disk (e.g. probe writes to `artifacts/`).
- **Conclusion:** Stage 3 **cannot be marked pass/fail from agent-observed output**. Treat verification as **pending operator execution**.

### Operator checklist (authoritative)

Run from repo root:

```bash
npm run test:unit
npm run build
```

**Expected (per prompt):** Prisma/static-generation warnings about `127.0.0.1:5432` during `next build` are acceptable locally if Postgres is down, **as long as the build exits successfully**.

### Tests / checks explicitly not run here

- **`npm run test:e2e`** (Playwright) was **not** in the prompt’s minimum set and was **not** run.
- Any **pre-existing failing tests** in the unit suite are **unknown** in this session because test output was not captured; if `test:unit` fails locally, capture the failure output and triage whether it relates to this rollout (likely unrelated if no code changed).

---

## Stage 4 — Delivery packaging

| Category | Detail |
|----------|--------|
| **Files changed by agent** | **None** (audit only). **Added:** `artifacts/stage-2-5-cursor-agent-report.md` (this file). |
| **Code diff for Mike’s “free job posting” objective** | **None required** — current `master` already matches the intent on reviewed public surfaces. |
| **Remaining risks** | (1) **Unverified** `test:unit` / `build` in this environment. (2) **Internal docs/artifacts** still mention “Post a Job (Free)” or SDR lines about free employer posting — could confuse staff. (3) **Prompt vs. live hero** mismatch noted above if that headline is still legally/product-sensitive. |

---

## Stage 5 — Git handoff

- **Commit:** **Not created** — no code or copy fixes were necessary for the stated objective; user instructed to avoid no-op commits.
- **Push:** **Not performed** — nothing new to ship from this agent pass; push status vs. `origin/master` should be confirmed locally after any future commits.

---

## Definition of done (mapped)

| Criterion | Status |
|---------|--------|
| Employer-facing “free” **job-posting** wording removed from **intended public marketing surfaces** (in-repo review) | **Met** on reviewed routes |
| Local `npm run test:unit` + `npm run build` run and captured | **Not completed in agent session** — **operator action required** |
| Commit + push if checks pass | **N/A here** (no changes); operator pushes when they have local verification and any future edits |

---

*End of report.*
