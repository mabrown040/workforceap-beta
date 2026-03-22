## CEO Review: Open Codex PR Stack (#164–#178)

**The Real Problem**
Right now we don’t have a “small bugfix queue” — we have 15 overlapping PRs changing the same employer matching/import surfaces, plus nav/copy/UI sweeps. The real problem is not just code correctness; it’s **shipping confidence**. If we merge in the wrong order, we can regress employer trust (bad recommendations, confusing readiness states, noisy imports), and burn review bandwidth on conflict churn instead of value.

---

## CEO Review: Employer Recommendation Quality (PRs #171/#172/#173 + #176/#177/#178)

**3-Star Version** (what was asked)
Tweak ranking logic, soften confidence labels, add readiness jump links, and auto-refresh recommendations.

**10-Star Version** (what would make employers rave)
A transparent “Why this program is suggested” panel with confidence + signal evidence + one-click fixes + live rerank that never loses selections. It behaves like a mini copilot: clear, stable, explainable.

**Riskiest Assumptions**
1. Better scoring logic will improve trust by itself → validate by: 5 employer usability sessions with think-aloud on top-3 suggestions.
2. Auto-refresh won’t feel jumpy/noisy → validate by: instrumentation on rerank frequency + cancel/undo interactions.
3. Softer copy won’t reduce action rates → validate by: A/B on submit-for-review completion from edit pages.

**Expansion Opportunities**
- Employer-side recommendation analytics (accept/reject by reason)
- Program ops feedback loop to retrain ranking heuristics
- AI-assisted job quality score prior to submit

**Kill Shot Test**
Would a competitor win customers with this alone? **Maybe**, if theirs is explainable + stable while ours feels opaque/jittery.

**Recommendation**
**Validate first before broad merge.** Merge one recommendation path (logic+UI+copy) as a coherent slice, not six partially overlapping slices.

---

## CEO Review: Import Reliability & Provenance (PRs #174/#175, overlap with #164)

**3-Star Version**
Sanitize scrape text, store provenance metadata, harden import handling.

**10-Star Version**
“Trustworthy import pipeline”: each draft shows source, confidence, extracted fields, and flagged gaps with quick fix actions. Admin can audit what changed from source to saved job.

**Riskiest Assumptions**
1. Sanitization won’t strip needed context → validate by: regression fixture suite on representative ATS pages.
2. Provenance fields are enough for audits → validate by: admin review workflow pilot on 20 imports.
3. Import fallback behavior won’t reintroduce generic placeholders → validate by: smoke script against top 5 real customer ATS feeds.

**Expansion Opportunities**
- Delta view (source snapshot vs edited posting)
- Auto-classification of parsing failure types
- SLA dashboard for import quality by provider

**Kill Shot Test**
Would users switch for this? **Yes**, if reliability and auditability are visibly better than manual copy/paste.

**Recommendation**
**Build 10-star direction incrementally.** Ship #175 + #174 first, then selectively pull #164 diagnostics pieces that do not duplicate import routes.

---

## CEO Review: Apply/Public UX Consistency (PRs #169/#170)

**3-Star Version**
Copy cleanup and step-flow messaging improvements.

**10-Star Version**
A fully coherent funnel: one promise across homepage/program/apply, clear eligibility logic, transparent next step timing, and no contradictory copy.

**Riskiest Assumptions**
1. Copy-only updates improve conversion materially → validate by: funnel analytics before/after per step.
2. Three-step framing matches user mental model → validate by: 10 moderated tests + drop-off reasons.
3. CTA standardization won’t flatten channel intent → validate by: route-specific CTA click-through comparisons.

**Expansion Opportunities**
- Personalized apply path by program intent
- Follow-up nudges based on incomplete step state
- Trust panel (timeline, support, outcomes) near submit

**Kill Shot Test**
Would users switch to another provider for this? **Not alone**, unless their funnel feels dramatically more trustworthy and easier.

**Recommendation**
**Build as-is, but instrument hard.** Merge only with clear analytics coverage to verify conversion impact.

---

## CEO Review: Navigation/UI Primitive Sweeps (PRs #165/#166/#168/#167)

**3-Star Version**
Standardize wording/navigation/components and improve dashboard/AI tools consistency.

**10-Star Version**
One coherent product language and shell system where role context is always explicit, actions are predictable, and users never wonder “where am I?”

**Riskiest Assumptions**
1. Broad sweeps won’t create context regressions → validate by: role-based smoke matrix (admin/partner/student/employer).
2. Primitive updates are non-breaking across all consumers → validate by: visual regression checks on top pages.
3. AI-tools consistency changes preserve user trust in outputs/history → validate by: end-to-end save/history replay tests.

**Expansion Opportunities**
- Shared design token enforcement
- Navigation telemetry to detect confusion loops
- Role-specific onboarding hints in-shell

**Kill Shot Test**
Would this alone cause switching? **No**, but poor navigation absolutely causes churn.

**Recommendation**
**Validate first before building further.** These are high blast-radius; ship behind strict smoke gates and in smaller slices.

---

## Portfolio-Level Recommendation (Tonight)

- **Do not merge all codex PRs as a batch.**
- Merge by value + isolation:
  1) #175 (scrape sanitization hardening)
  2) #174 (provenance metadata)
  3) One recommendation UI/copy pass (choose between #176/#178 baseline, then fold #177)
  4) Scoring engine pass (#172 then #173 then #171)
- Hold broad sweeps (#165/#166/#167/#168/#169/#170) until conflict/QA budget is available.

If one thing is breaking, it will likely be from overlap zones (ranking stack, import stack, shared CSS, portal shell). Treat those as merge-gated clusters, not independent PRs.
