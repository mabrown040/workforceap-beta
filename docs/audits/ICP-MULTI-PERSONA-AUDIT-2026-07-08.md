# ICP & Multi-Persona Audit — 2026-07-08

**Scope:** Member ICP copy/UX, five portal personas (member, counselor, employer, partner, admin), and verification of five flagged gaps.  
**Sources:** `MEMBER_ICP_AUDIT_REPORT.md`, `docs/FUNDING-COPY-MIGRATION.md`, `CEO-REVIEW-2026-06-10.md`, live grep/read of the repo (not assumptions).  
**Architecture note:** Public marketing (`/`, `/programs`, `/faq`, …) is **Astro-served** (`marketing/src/`). Next.js owns `/apply`, portals, and admin. Copy changes must land in **both** surfaces where strings are duplicated.

---

## Executive summary

The platform is **operationally constrained, not feature-constrained**. CEO review data (53 pending applications, median 40 days, zero approvals) remains the dominant funnel risk. Several **plan-ceo-review** force-multipliers shipped (counselor command center, external apply logging, board outcomes, walk-in sessions), but **member trust copy is still inconsistent** across Astro metadata, Next FAQ data, and portal surfaces.

**Verified gap status (five flagged items):**

| Gap | Status (2026-07-08) | Evidence |
|-----|----------------------|----------|
| Homepage H1 abstract vs specific | **Open** | Astro `marketing/src/components/Home.astro` renders `heroTagline` / `heroTaglineAccent` → “Empowering People.” / “Advancing Futures.” (`messages/en.json` L1395–1396) |
| Programs metadata qualified funding copy | **Partially open** | Astro `marketing/src/pages/programs.astro` L197–198: meta says “at no cost to **qualifying** members” but not branded/consistent; in-page hero L213 repeats same pattern. `docs/FUNDING-COPY-MIGRATION.md` **not applied** — zero “Workforce Funded Training” strings in `messages/en.json` |
| Dashboard English leaks | **Open** | Hardcoded EN in `DesktopDashboard.tsx` L140, `MobilePointsSection.tsx` L53, `PointsWidget.tsx` L340, `dashboard/points/page.tsx` L359 — i18n keys exist (`dashboard.activeProgram`, `dashboard.priorityAction`) but unused in these spots |
| AI beta/included copy | **Open** | `app/(portal)/dashboard/ai-tools/page.tsx` L114–130 renders `marketing.blog.includedForMembers` + `betaAccess` (“Included for members” / “Beta Access”) with no qualifying / no-extra-fee framing |
| Spanish parity on apply | **Partially fixed** | `ApplyEligibilityClient.tsx` uses `useTranslations('apply')` for core flow; **remaining EN leaks:** `AGE_GROUPS` labels (L25–28), `PRIMARY_BARRIER_OPTIONS` from `lib/apply/primaryBarrierOptions.ts` (all English labels) |

**Improvements since prior audits:** Apply step-0 mobile progress (`ApplyMobileStepNav activeStep={0}` on `app/apply/page.tsx`); eligibility Q1/Q2 + most apply chrome internationalized; EN `contrast2` tightened (`messages/en.json` L1483); fake “87% placement” hero widget removed from Astro (`marketing/src/styles/blend.css` comment); account/privacy i18n per CEO review appendix.

**Highest-risk finding:** `lib/content/faqData.ts` still answers “Is it really no-cost?” with blanket **“at no cost to members”** (no “qualifying” in the same breath) — used by Next-owned FAQ surfaces and undermines ICP trust.

---

## Scorecard

Scores 1–10 (10 = best for low-income, mobile-first, institution-skeptical ICP). “Δ” = direction since `MEMBER_ICP_AUDIT_REPORT.md`.

| Surface / persona | Clarity | Trust | Actionability | Mobile | Notes |
|-------------------|--------:|------:|--------------:|-------:|-------|
| Homepage hero (Astro) | 5 (→) | 5 (↓) | 7 | 7 | H1 still abstract; `memberPromiseTitleAccent` = “no cost to members.” without qualify in accent line |
| Apply flow (Next) | 7 (↑) | 7 (↓) | 8 | 7 | i18n improved; barrier/age labels still EN |
| Programs (Astro) | 6 | 6 | 6 | 7 | SEO partially qualified; not aligned with funding migration doc |
| Member dashboard | 5 | 6 (↓) | 6 | 8 | 1,369-line `page.tsx`; EN leaks; competing “next” blocks |
| AI tools hub | 6 | 4 (↓) | 7 | 7 | Beta + “included” without guardrails |
| Counselor portal | 7 | 7 | 8 | 7 | Command center shipped; queue ops still bottleneck |
| Employer portal | 6 | 6 | 7 | 6 | Guide FAQ hardcoded English |
| Partner portal | 6 | 6 | 7 | 6 | Guide FAQ hardcoded English; funding line unqualified |
| Admin / board | 7 | 6 | 7 | 6 | Board outcomes exist; engagement telemetry incomplete |
| Spanish parity | — | 5 | 6 | 6 | Apply barriers + AI labels weakest |
| Site-wide funding copy | — | **5 (↓)** | — | — | Migration doc unmerged; Astro + `faqData.ts` drift |

---

## Persona gaps (plan-ceo-review + codebase)

Code comments tagged `plan-ceo-review` reference shipped intent: counselor command center (`lib/counselor/commandCenter.ts`), external apply loop (`LogExternalApplicationButton.tsx`), board buyer surface (`lib/admin/boardOutcomes.ts`), walk-in A-to-Z demo (`WalkInSessionClient.tsx`), session packet email (`emails/session-packet.ts`), act-as-subject reframe (`lib/auth/actAsSubject.ts`). **Open issues below are what remains.**

### Member — top 3 open issues

| # | Issue | Path(s) | Sev |
|---|-------|---------|-----|
| 1 | Dashboard information overload + multiple competing “next” concepts for states B/C | `app/(portal)/dashboard/page.tsx` (~1,369 lines) | **P1** |
| 2 | Hardcoded English in localized dashboard (points, active program label) | `app/(portal)/dashboard/_components/DesktopDashboard.tsx`, `MobilePointsSection.tsx`, `components/portal/PointsWidget.tsx`, `app/(portal)/dashboard/points/page.tsx` | **P1** |
| 3 | Apply eligibility barrier + age option labels still English-only | `lib/apply/primaryBarrierOptions.ts`, `app/apply/ApplyEligibilityClient.tsx` (`AGE_GROUPS`) | **P1** |

*Also P1:* AI hub “Beta Access” / “Included for members” (`app/(portal)/dashboard/ai-tools/page.tsx`, `messages/*.json` `marketing.blog.*`).

### Counselor — top 3 open issues

| # | Issue | Path(s) | Sev |
|---|-------|---------|-----|
| 1 | Application approval throughput — platform cannot convert members while queue ages | Ops + `app/admin/overview/page.tsx` (pending count UI); per CEO review production data | **P0** |
| 2 | Coursera identity / completion attach — ~half of learner traffic may not map to members | `lib/member/courseProgress.ts`, `lib/coursera/csvImport.server.ts`, `lib/xapi/reprocess.ts` | **P0** |
| 3 | Counselor home still stacks many widgets (priority queue + command center + at-risk + mobile hero) | `app/(portal)/counselor/page.tsx` | **P1** |

*Shipped (plan-ceo-review):* `CounselorCommandCenter`, priority queue, walk-in session intake.

### Employer — top 3 open issues

| # | Issue | Path(s) | Sev |
|---|-------|---------|-----|
| 1 | Employer guide FAQ + differentiators hardcoded English (no i18n) | `app/(portal)/employer/guide/page.tsx` (`FAQS`, `DIFFERENTIATORS`, `QUICK_NAV`) | **P1** |
| 2 | Guide copy says posting is “at no cost to **members**” — confusing for employer audience | `app/(portal)/employer/guide/page.tsx` L37–41 | **P2** |
| 3 | Duplicate / dense mobile hub chrome (per G5 audit) | `app/(portal)/employer/page.tsx` | **P2** |

### Partner — top 3 open issues

| # | Issue | Path(s) | Sev |
|---|-------|---------|-----|
| 1 | Partner guide entirely hardcoded English | `app/(portal)/partner/guide/page.tsx` (`FAQS` L18–35) | **P1** |
| 2 | Referral guide uses unqualified “at no cost to members” | `app/(portal)/partner/guide/page.tsx` L94 | **P2** |
| 3 | Partner outcomes depend on admin verification latency (same approval bottleneck) | `app/(portal)/partner/outcomes/page.tsx`, admin placement workflow | **P0** (ops) |

### Admin — top 3 open issues

| # | Issue | Path(s) | Sev |
|---|-------|---------|-----|
| 1 | `last_login_at` column exists but **no login write path** found — engagement metrics unreliable | `prisma/schema.prisma`, `CEO-REVIEW-2026-06-10.md`; grep shows read-only usage in admin lists | **P0** |
| 2 | Feature surface >> active learner count — retention/gamification premature vs approvals | `CEO-REVIEW-2026-06-10.md` §6; `app/(portal)/dashboard/points/` | **P1** |
| 3 | Board outcomes pilot framing hides weak placement metrics — needs real data before buyer demos | `components/admin/BoardOutcomesView.tsx` (`isPilotPhase` banner) | **P2** |

*Shipped (plan-ceo-review):* `lib/admin/boardOutcomes.ts`, `app/admin/command-center/page.tsx`, admin Today/command-center patterns.

---

## Prioritized action list (max 15)

| # | Action | Persona | Type | Sev |
|---|--------|---------|------|-----|
| 1 | Clear pending application queue; target median &lt; 7 days | Counselor / Admin / Member | **Ops** | P0 |
| 2 | Wire `lastLoginAt` update on successful auth login | Admin / Counselor | **Code** | P0 |
| 3 | Coursera identity backfill: re-link `userId IS NULL` rows on mapping create; replay `ignored` completions | Admin / Member | **Code** | P0 |
| 4 | Fix blanket “no cost to members” in FAQ + homepage SEO descriptions | Member / ICP | **Copy** | P0 |
| 5 | Internationalize `PRIMARY_BARRIER_OPTIONS` + `AGE_GROUPS` (move to `messages/*`) | Member / ES | **Code + copy** | P0 |
| 6 | Execute `docs/FUNDING-COPY-MIGRATION.md` on `messages/en.json` **and** mirror in Astro (`marketing/src/i18n/`, hardcoded `programs.astro` meta) | Member / ICP | **Copy** | P1 |
| 7 | Rewrite homepage H1/subhead for safety + specificity (Astro `Home.astro` + `messages/*/marketing.home`) | Member / ICP | **Copy** | P1 |
| 8 | Replace dashboard hardcoded strings with existing `dashboard.*` keys | Member / ES | **Code** | P1 |
| 9 | Reframe AI hub: drop or qualify “Beta Access”; add “no extra fee for qualifying members” line | Member | **Copy** | P1 |
| 10 | Fold dashboard empty sections / single “Today” block for new members | Member | **Code** | P1 |
| 11 | Internationalize employer + partner guide FAQs | Employer / Partner | **Code + copy** | P1 |
| 12 | Align `lib/content/faqData.ts` with qualified funding language (match `messages/en.json` intent) | Member / ICP | **Copy** | P1 |
| 13 | Spanish `includedForMembers` + funding nuance on AI/marketing blog keys | Member / ES | **Copy** | P1 |
| 14 | Verify `member-files` bucket migration deployed to production (cert upload 500) | Admin / Member | **Ops + infra** | P1 |
| 15 | Add axe checks to Playwright suite (CEO review §5) | All | **Code** | P2 |

**Copy-only (no logic):** 4, 6, 7, 9, 12, 13  
**Code-only:** 2, 8, 10, 15  
**Ops / mixed:** 1, 3, 5, 11, 14

---

## Appendix — verified strings (grep snapshots)

**Homepage H1 (still abstract):**
```
messages/en.json → marketing.home.heroTagline: "Empowering People."
messages/en.json → marketing.home.heroTaglineAccent: "Advancing Futures."
marketing/src/components/Home.astro L13 → renders both as <h1>
```

**Programs metadata (Astro):**
```
marketing/src/pages/programs.astro L198
description="Explore career training programs offered at no cost to qualifying members, ..."
```

**Dashboard EN leak example:**
```
app/(portal)/dashboard/_components/DesktopDashboard.tsx L140 → "Active program"
messages/en.json → dashboard.activeProgram: "Active Program" (exists, unused here)
```

**AI badges:**
```
messages/en.json → marketing.blog.includedForMembers: "Included for members"
messages/en.json → marketing.blog.betaAccess: "Beta Access"
```

**Apply Spanish gap:**
```
lib/apply/primaryBarrierOptions.ts → all `label` fields English
app/apply/ApplyEligibilityClient.tsx L578–639 → renders those labels directly
```

**Funding migration doc vs reality:**
```
docs/FUNDING-COPY-MIGRATION.md describes "Workforce Funded Training" sweep
grep "Workforce Funded Training" messages/en.json → 0 matches
```

---

## Related documents

- `MEMBER_ICP_AUDIT_REPORT.md` — original member copy scores (2026 review)
- `CEO-REVIEW-2026-06-10.md` — production funnel data + week-1 gates
- `docs/FUNDING-COPY-MIGRATION.md` — intended EN funding copy (pending merge)
- `docs/audits/g5-mobile-parity-2026-05-18.md` — mobile portal parity
