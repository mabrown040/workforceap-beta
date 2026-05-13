# Multi-Sprint Plan — WorkforceAP Platform

**Date:** 2026-05-13
**Author:** Dench (ops agent)
**Status:** Draft — pending review
**Scope:** Revenue hardening → Scale mechanisms → Expansion → Optimization

---

## Context

Today we shipped four major capability areas:

1. **Revenue:** Stripe employer tier subscriptions + partner payout infrastructure
2. **Pipeline:** 7-stage enrollment dashboard + WIOA compliance reporting
3. **Automation:** Placement surveys + at-risk member alerts + weekly counselor recaps
4. **Expansion:** White-label org onboarding scaffold + SEO meta foundations + i18n framework

This plan sequences the next 8 weeks into 4 two-week sprints, each with a single clear objective.

---

## Sprint 1: Revenue Hardening (Now – May 27)

**Objective:** Make money flow. Convert the Stripe integration from test-mode scaffolding to live transactions and close the first paying employer.

| Key Result | Owner | Target Date |
|---|---|---|
| Stripe switched from test mode to live mode with production webhook verification | Dench | May 20 |
| Employer onboarding funnel (landing → signup → tier select → payment) achieves ≥60% step-to-step conversion | Dench | May 24 |
| Partner payout executes first real transaction end-to-end | Dench | May 26 |
| First paid employer signup (any tier) completes successfully | Dench | May 27 |

**Dependencies:**
- Stripe live-mode account approval (Mike to confirm)
- Employer landing page copy finalization (member-first language)
- Bank account / payout routing verified for partner distributions

**Risks:**
- Stripe live-mode onboarding delays (mitigation: initiate account verification immediately)
- Employer value proposition unclear → low conversion (mitigation: A/B test tier descriptions, lead with outcomes not features)
- Partner payout tax/regulatory questions (mitigation: confirm 501(c)(3) reporting treatment with Michael Brown Sr.)

**Definition of Done:**
- [ ] Live Stripe dashboard shows ≥1 successful subscription charge
- [ ] Employer onboarding funnel analytics instrumented and reviewed
- [ ] Partner payout transaction logged with traceable disbursement record
- [ ] No P0/P1 bugs in revenue-critical path for 48 hours

---

## Sprint 2: Scale Mechanisms (May 28 – June 10)

**Objective:** Automate compliance and outcomes reporting so counselors spend less time on paperwork and more time on members.

| Key Result | Owner | Target Date |
|---|---|---|
| WIOA reporting generates automated quarterly filing package (CSV + PDF) | Dench | Jun 3 |
| Placement survey response rate tracked per cohort; ≥40% response rate | Dench | Jun 5 |
| At-risk alert adopted by ≥3 active counselors with acknowledged interventions | Dench | Jun 8 |
| Outcome analytics embeddable widget live for public / funder demonstration | Dench | Jun 10 |

**Dependencies:**
- Sprint 1 pipeline dashboard stable in production
- WIOA field definitions confirmed with grant compliance officer
- Counselor Slack/email delivery tested and spam-score clean

**Risks:**
- WIOA field mapping incomplete (mitigation: maintain manual override CSV export)
- Counselors ignore at-risk alerts (mitigation: Slack integration + daily digest, not just email)
- Survey fatigue drops response rate (mitigation: SMS fallback, 3-question max, incentivized)

**Definition of Done:**
- [ ] WIOA report generated with zero manual cell entry
- [ ] Placement survey dashboard shows per-cohort breakdown with ≥40% response rate
- [ ] At-risk alert log shows counselor acknowledgments and follow-up actions
- [ ] Outcome widget renders correctly on external site (iframe or JS embed)

---

## Sprint 3: Expansion (June 11 – June 24)

**Objective:** Grow reach. Launch a white-label customer, new language support, a new program vertical, and a mobile PWA.

| Key Result | Owner | Target Date |
|---|---|---|
| First white-label organization onboarded with custom subdomain and branded emails | Dench | Jun 15 |
| French and Portuguese program content live with locale-aware routing | Dench | Jun 18 |
| AI + Software Development program vertical published with full curriculum stack | Dench | Jun 21 |
| Mobile PWA installable from Chrome/Android with offline dashboard access | Dench | Jun 24 |

**Dependencies:**
- White-label tenant isolation fully tested (refer to `TENANT-ISOLATION.md`)
- Translation workflow established (i18n keys extracted, translator access)
- Curriculum content authored and reviewed for AI+Software Dev track
- PWA service worker caching strategy defined

**Risks:**
- White-label customer requires custom features we haven't scoped (mitigation: strict MVP — subdomain, logo, colors only)
- Translation quality poor without native review (mitigation: partner with bilingual staff member for QA)
- PWA scope creeps into native app territory (mitigation: ship add-to-home + offline dashboard only)

**Definition of Done:**
- [ ] White-label org domain resolves, members can enroll, emails send with org branding
- [ ] `/fr/` and `/pt/` routes return fully translated program pages
- [ ] AI+Software Dev program visible on public site with enrollment path
- [ ] Lighthouse PWA audit scores ≥90; install prompt triggers on Android Chrome

---

## Sprint 4: Optimization (June 25 – July 8)

**Objective:** Harden quality. Performance, accessibility, SEO, and security must all meet enterprise-grade standards before Q3 fundraising push.

| Key Result | Owner | Target Date |
|---|---|---|
| Production JS bundle <200KB initial load; Core Web Vitals all green | Dench | Jun 30 |
| WCAG 2.1 AA audit passed with zero critical violations | Dench | Jul 3 |
| Program pages rank on first page for "free job training Austin" and 2 other target keywords | Dench | Jul 6 |
| Security audit remediation complete (all critical + high findings closed) | Dench | Jul 8 |

**Dependencies:**
- Production build profiling baseline established
- Accessibility audit tooling configured (axe, Lighthouse, manual screenreader)
- SEO keyword list finalized with Mike
- Security audit vendor or internal pentest scheduled

**Risks:**
- Bundle split breaks dynamic imports (mitigation: test every route post-split)
- Accessibility fixes require component redesign (mitigation: prioritize semantic HTML over ARIA)
- SEO ranking takes longer than 2 weeks (mitigation: publish programmatic location pages early in sprint)
- Security audit surfaces architectural issues (mitigation: buffer 3 days at end of sprint for hotfixes)

**Definition of Done:**
- [ ] PageSpeed Insights shows LCP <2.5s, CLS <0.1, TBT <200ms on 3G
- [ ] axe DevTools zero violations on all public + authenticated pages
- [ ] Google Search Console shows impressions and clicks on target keywords
- [ ] Security audit report signed off with all critical/high issues remediated

---

## Cross-Sprint Foundations (Ongoing)

| Area | Status | Notes |
|---|---|---|
| **Observability** | In progress | Datadog / Sentry integration; need error alerting threshold tuning |
| **Database backups** | Automated | Daily Supabase snapshots + weekly offsite export |
| **Feature flags** | Active | LaunchDarkly-lite via env vars; evaluate full SDK if white-label needs per-tenant toggles |
| **Documentation** | Stale | COUNSELOR-RUNBOOK.md updated; API docs need OpenAPI generation |
| **Analytics** | Partial | Mixpanel events instrumented on revenue path; needs funnel views for S2–S4 |

---

## Roll-up Metrics (Target: Jul 8)

| Metric | Current | Target |
|---|---|---|
| Monthly recurring revenue (MRR) | $0 | ≥$500 |
| Active employer accounts | 0 | ≥3 |
| WIOA reports filed manually | 100% | 0% |
| Placement survey response rate | N/A | ≥40% |
| At-risk interventions logged | 0 | ≥20 |
| White-label orgs live | 0 | 1 |
| Supported languages | 1 (EN) | 3 (EN, FR, PT) |
| Program verticals | 3 | 4 |
| Lighthouse Performance | ~45 | ≥90 |
| WCAG 2.1 AA violations | Unknown | 0 critical |
| Security audit critical findings | Unknown | 0 |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-13 | 14-day sprints | Balance of delivery velocity + planning overhead. Monthly too long for current momentum. |
| 2026-05-13 | Revenue before scale | Need to prove unit economics before grant reports or white-label sales become credible. |
| 2026-05-13 | Security audit last | Fixes depend on all prior features being stable; running earlier risks re-auditing. |
| 2026-05-13 | PWA over native app | Member ICP is low-income Android users; PWA is zero-friction install, no app store gatekeeping. |

---

## Open Questions

1. Has Stripe live-mode account been submitted for approval?
2. Who is the target first white-label customer? (Partner org? Funder? Municipality?)
3. Do we have bilingual staff for FR/PT translation QA?
4. Is the AI+Software Dev curriculum already drafted, or does content creation block S3?
5. Security audit: internal pentest or hire external firm? Budget?

---

*Next step: Review with Mike. Lock dates. Assign any external dependencies. Then commit and start Sprint 1.*
