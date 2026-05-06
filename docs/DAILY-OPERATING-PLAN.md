# WorkforceAP — Daily Operating Plan
**Updated:** 2026-05-06 · **Owner:** Dench (ops agent) · **Human override:** Mike  
**Purpose:** Autonomous daily execution across Site, Materials, Ads, and Testing. Pick from lanes. Ship something every day.

---

## Operating Rhythm

| Day | Theme | Primary Lane |
|-----|-------|--------------|
| **Monday** | Partner push | Materials + Site polish |
| **Tuesday** | Ads + acquisition | Ads setup + Meta creative |
| **Wednesday** | Product reliability | Testing + QA + Coursera hardening |
| **Thursday** | Content + SEO | Site content + Blog + Email nurture |
| **Friday** | Review + prep | Metrics + Next week plan + CRM cleanup |

**Daily standup (self-directed):**
1. Read `tasks/QUEUE.md` — what's In Progress vs Blocked
2. Read `SESSION-STATE.md` — what changed yesterday
3. Pick 1–2 items from today's lane. Ship before moving on.
4. Update `memory/YYYY-MM-DD.md` with what shipped
5. Only ping Mike for blockers, risky decisions, or completions

---

## LANE 1: SITE (Dev / QA / Fixes)

### Active Work Queue

| # | Task | Priority | Est. Time | Status |
|---|------|----------|-----------|--------|
| 1.1 | **Coursera end-to-end smoke test** — verify email linking + program launch + progress sync works on staging | P0 | 2h | ⏳ Ready |
| 1.2 | **Partner dashboard Slice 1** — tight KPIs + denominator text + attention queue CTA (from `AAYHF-partner-dashboard-spec`) | P0 | 4h | ⏳ Ready |
| 1.3 | **i18n routing setup** — `/es`, `/fr`, `/pt` locale routing with next-intl | P1 | 6h | ⏳ Ready |
| 1.4 | **Summer Accelerator landing page** — dedicated page for Concordia/high-school pilot | P1 | 4h | ⏳ Ready |
| 1.5 | **Funding partners public page** — name actual grantors/partners on site for trust | P1 | 3h | ⏳ Ready |
| 1.6 | **Mobile dashboard scroll fix** — Find Your Path sticky strip hiding content (partial fix shipped, verify) | P0 | 1h | ✅ Shipped |
| 1.7 | **Placement confirmation dismiss** — stop card from re-appearing after acceptance | P0 | 1h | ✅ Shipped |
| 1.8 | **Points widget visibility** — show even at 0 points as motivator | P0 | 1h | ✅ Shipped |
| 1.9 | **Homepage hero copy** — full org description replacing brief feature list | P0 | 1h | ✅ Shipped |
| 1.10 | **Delete stale branches** — 4 confirmed-in-master branches can be removed | P1 | 15m | ⏳ Ready |
| 1.11 | **Sentry error audit** — check JAVASCRIPT-NEXTJS-4/5/6 recurrence post-PR-978 | P1 | 1h | ⏳ Ready |
| 1.12 | **Coursera Spanish/French/Portuguese course research** — map catalog to available localized courses | P2 | 2h | ⏳ Ready |

### Daily Site Checks (Autonomous — Every Morning)

```
[ ] npm run build passes (local)
[ ] npm run lint — 0 errors
[ ] Unit tests — 198 pass
[ ] Vercel production deploy status (check latest commit is READY)
[ ] Sentry — any new errors in last 24h?
[ ] gbrain sync --repo ~/workspace/wap-repo --strategy code (if stale)
```

### Weekly Deep QA (Wednesday)

```
[ ] Full public site smoke: homepage → programs → apply → find-your-path
[ ] Portal smoke: login → dashboard → training → profile → AI toolkit
[ ] Mobile responsive: iPhone SE width (375px) + iPad (768px)
[ ] Partner portal: /partner login → referred members → attention queue
[ ] Admin: /admin → members → programs → pipeline
[ ] Coursera: member clicks program → lands in Coursera → email pre-linked
[ ] Auth: cross-portal login loop test (super-admin across member/admin/employer/partner/counselor)
```

---

## LANE 2: MATERIALS (Collateral / Content / Sales Enablement)

### Active Asset Queue

| # | Asset | Purpose | Owner | Due | Status |
|---|-------|---------|-------|-----|--------|
| 2.1 | **Partner one-pager** (PDF) | Email attachment for partner discovery | Dench | 2026-05-06 | ✅ Shipped |
| 2.2 | **Dad demo script** (PDF) | 5-minute spoken walkthrough with backup slides | Dench | 2026-05-06 | ✅ Shipped |
| 2.3 | **Partner pitch deck** (10-slide, Google Slides) | Discovery call leave-behind | Dench | 2026-05-12 | ⏳ Ready |
| 2.4 | **Employer one-pager** (PDF) | Pipeline pitch for HR/TA leaders | Dench | 2026-05-10 | ⏳ Ready |
| 2.5 | **Summer Accelerator landing page copy** | Concordia high-school pilot | Dench | 2026-05-13 | ⏳ Ready |
| 2.6 | **AI apprenticeship positioning page** | Blog/landing: "AI-Ready Pathways" + DOL portal link | Dench | 2026-05-10 | ⏳ Ready |
| 2.7 | **WIOA board pitch script** (1-page) | Selective board outreach | Dench | 2026-05-13 | ⏳ Ready |
| 2.8 | **SDF consortium one-pager** | Community college + employer pitch | Dench | 2026-05-16 | ⏳ Ready |
| 2.9 | **Email nurture sequence (summer pilot)** | 5-touch sequence for high-school inquiries | Dench | 2026-05-15 | ⏳ Ready |
| 2.10 | **Member welcome email template** | Post-application auto-reply | Dench | 2026-05-09 | ⏳ Ready |
| 2.11 | **Counselor session follow-up template** | Post-AI-tool session summary email | Dench | 2026-05-11 | ⏳ Ready |

### Materials Production Rhythm

```
Monday:    Partner collateral (one-pagers, decks, scripts)
Tuesday:   Ad creative + landing page copy
Wednesday: Blog content + SEO articles
Thursday:  Email templates + nurture sequences
Friday:    Polish + review + file in Drive
```

---

## LANE 3: ADS (Meta / LinkedIn / Acquisition)

### Ads Setup Checklist

| # | Task | Priority | Owner | Status |
|---|------|----------|-------|--------|
| 3.1 | **Meta Business Manager + Pixel** — create/reclaim, install pixel on workforceap.org | P0 | Mike/Dench | ⏳ Ready |
| 3.2 | **Meta Conversions API** — server-side events for apply start, apply complete | P0 | Dench | ⏳ Ready |
| 3.3 | **LinkedIn Campaign Manager** — company page + ad account setup | P1 | Mike/Dench | ⏳ Ready |
| 3.4 | **LinkedIn Insight Tag** — install on site for retargeting | P1 | Dench | ⏳ Ready |
| 3.5 | **Meta ad creative — Variant A** | Adult career changer, 25-40, Austin metro, "Free IT training" (corrected: "no-cost") | P1 | Dench | ⏳ Draft |
| 3.6 | **Meta ad creative — Variant B** | Justice-impacted / second chance, "New career starts here" | P1 | Dench | ⏳ Draft |
| 3.7 | **Meta ad creative — Variant C** | Spanish-language, Austin Hispanic community, "Capacitación gratuita en tecnología" (corrected) | P1 | Dench | ⏳ Draft |
| 3.8 | **LinkedIn employer ad** | Pipeline pitch to HR/TA leaders in Austin tech | P2 | Dench | ⏳ Not started |
| 3.9 | **Google Ads (Search)** — "free IT training Austin", "CompTIA certification free", "career training Austin" | P2 | Dench | ⏳ Not started |
| 3.10 | **Retargeting audience** — website visitors who didn't apply | P1 | Dench | ⏳ Ready |

### Ad Copy Rules (Immutable)

- ❌ Never say "free" without qualification
- ✅ Always say "no-cost for qualifying members" or "funded by grants and partnerships"
- ❌ Never imply universal eligibility
- ✅ Always include geography (Austin / Central Texas) unless national campaign
- ❌ Never promise jobs, only "job-ready training" and "placement support"
- ✅ All ad creative goes through Mike sign-off before launch

### Ads Operating Rhythm

```
Monday:    Review weekend ad performance (once live)
Tuesday:   Build new creative variants
Wednesday: A/B test analysis + budget reallocation
Thursday:  Audience refinement + retargeting
Friday:    Weekly performance report to Mike
```

---

## LANE 4: TESTING (QA / Smoke / Regression)

### Daily Automated Checks

| Check | Tool / Method | Threshold |
|-------|---------------|-----------|
| Build passes | `npm run build` | Must pass |
| Lint clean | `npm run lint` | 0 errors |
| Type check | `npx tsc --noEmit` | 0 errors (ignore existing test file issue) |
| Unit tests | `npm test` | 198 pass |
| Vercel deploy | API check | `READY` state |
| Sentry errors | Sentry dashboard | No new critical/high in 24h |

### Weekly Manual QA (Wednesday)

**Public Funnel:**
```
[ ] Homepage loads < 3s, hero visible, CTA clickable
[ ] Programs page → 4 featured cards render
[ ] Find Your Path → quiz completes → results show
[ ] Apply → all 4 steps submit without error
[ ] Mobile: no horizontal scroll, tap targets > 44px
[ ] Footer: nonprofit disclosure visible
```

**Portal Funnel:**
```
[ ] /login → /dashboard (member)
[ ] Dashboard: points widget visible, progress strip accurate
[ ] AI Toolkit: elevator pitch → generates output
[ ] Training: Coursera link opens, email pre-linked
[ ] Profile: can edit, save persists
[ ] Mobile: bottom nav doesn't hide content
```

**Partner / Admin Funnel:**
```
[ ] /partner login → dashboard with referred members
[ ] Attention queue: flags stalled members
[ ] /admin: member list loads, can search
[ ] /admin/programs: stats render once (no duplication)
```

**Auth Cross-Portal:**
```
[ ] Super-admin: /dashboard → /admin → /employer → /partner → /counselor
[ ] Logout from any portal clears session
[ ] No redirect loops between /login and portal
```

---

## LANE 5: CRM / OPS (Data Hygiene + Reporting)

### Daily CRM Checks

```
[ ] New applications (last 24h): count + status distribution
[ ] Unassigned applicants: need counselor assignment?
[ ] Stuck members (no activity > 7 days): flag for outreach
[ ] Partner referrals (last 24h): new + milestone updates
[ ] Sentry new issues: categorize and assign
```

### Weekly Reporting (Friday)

```
[ ] Applications: volume, completion rate, source breakdown
[ ] Enrollments: new starts, active training, completions
[ ] Partner activity: referrals, milestone progress, attention queue
[ ] Employer: pipeline status, job postings, candidate matches
[ ] Site health: build status, deploy history, error count
[ ] Ad performance (once live): spend, CTR, CPL, apply rate
```

---

## Priority Rules

1. **P0 (Fire):** Auth breakers, trust-breaking copy, payment/data leaks, 500 errors — fix immediately
2. **P1 (Ship):** Partner collateral, Coursera hardening, ad setup, mobile fixes — ship same day
3. **P2 (Queue):** Content expansion, SEO, advanced analytics — batch for dedicated days
4. **P3 (Defer):** Nice-to-have UI polish, speculative features — only if P0-P2 clear

**Autonomy Rule:** If P0-P2 are clear and no human blocker exists, Dench works P2 without asking. If P0 or P1 exists, drop everything and ship it.

---

## Blockers (Human-Gated)

| Blocker | Who | What Needed |
|---------|-----|-------------|
| Meta Business Manager / Pixel | Mike | Create/reclaim FB Business Manager, add Dench as admin |
| LinkedIn Campaign Manager | Mike | Company page verification, ad account setup |
| Coursera prod env verification | Mike/Dad | Confirm xAPI credentials entered in Coursera admin console |
| Concordia articulation agreement | Mike/Dad | Written confirmation from Concordia registrar |
| Meta ad spend approval | Mike | Budget cap + payment method |
| Google Ads account | Mike | Create account, link to workforceap.org |

---

## Quick Links

- **Queue:** `tasks/QUEUE.md`
- **Session State:** `SESSION-STATE.md`
- **GTM Plan:** `docs/gtm-overnight-sprint-plan-2026-05-06.md`
- **Partner Collateral:** [Google Drive — WAP Partner Collateral](https://drive.google.com/drive/folders/1Y9qkABNkTWdxNWh06FDbMxKq8Qt08axk)
- **Sales Playbooks:** `docs/sales/gtm-strategy.md`, `docs/sales/employer-sales-playbook.md`, `docs/sales/partner-development-playbook.md`
- **Repo:** `~/workspace/wap-repo` (master)

---

*Dench updates this file when lanes shift or blockers clear. Last update: 2026-05-06*
