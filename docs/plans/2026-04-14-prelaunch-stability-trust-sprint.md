# Prelaunch Stability and Trust Sprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilize the public WorkforceAP site and tighten trust-critical copy and flows without doing a broad homepage rewrite.

**Architecture:** Run the sprint in four workstreams: public reliability, trust surfaces, funnel truth pass, and restrained public-page cleanup. Reliability fixes land first, then factual trust improvements, then copy tightening only where it reduces confusion or overclaim risk.

**Tech Stack:** Next.js App Router, React, TypeScript, Vercel deployment previews, GitHub PR workflow.

---

## Locked guardrails for this sprint

### Approved claims
- Workforce Advancement Project / WorkforceAP is a **nonprofit** and **501(c)(3)**.
- WorkforceAP can be described as serving people **nationally**.
- Programs are **no cost to members**.
- **Laptops are available for members who need them**.
- WorkforceAP may reference **partners** and **provider-backed courses**.
- Existing homepage/provider **logos stay**.

### Copy restrictions
- Do not imply the organization itself has existed for 25 years unless the source copy already says that explicitly and accurately.
- If 25 years is needed, prefer language like **built on / informed by 25 years of workforce experience**.
- Do not add EIN, response-time promises, guaranteed laptop promises, or new outcome stats unless already present and approved.
- Do not remove homepage logos as part of “cleanup”.
- Respect the current homepage stance: improve clarity only, not a broad homepage repositioning or redesign.
- "WorkforceAP" and "Workforce Advancement Project" are both acceptable. Use best judgment by context.

## Not in scope for this sprint
- Major homepage redesign
- New proof claims that need legal/ops validation
- Broad SEO/content expansion
- Nice-to-have portal polish ahead of public reliability issues

## Workstream 1: Public reliability sweep (P0)

**Primary files / surfaces to inspect**
- `app/blog/[slug]/page.tsx`
- `app/blog/page.tsx`
- `app/faq/page.tsx`
- `app/faq/FAQContent.tsx`
- `app/(decision-journey)/program-comparison/page.tsx`
- `app/(decision-journey)/program-comparison/ProgramComparisonClient.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/sitemap.ts`

**Tasks**
1. Reproduce and fix blog post 500s.
2. Verify blog listing links resolve correctly.
3. Fix FAQ rendering/content issues.
4. Fix the program comparison loading failure, or hide the page/entry points until fixed.
5. Smoke test sitemap-backed public routes for blank states and server errors.
6. Confirm `privacy` and `terms` load cleanly.

**Exit criteria**
- No known public 500 pages remain.
- No core public page is blank or stuck loading.
- Broken pages are fixed or intentionally hidden from navigation/sitemap.

## Workstream 2: Trust layer, factual only (P0/P1)

**Primary files / surfaces to inspect**
- `components/Footer.tsx`
- `app/page.tsx`
- `app/contact/page.tsx`
- `app/what-we-do/page.tsx`
- `app/impact/page.tsx`

**Tasks**
1. Add or tighten footer trust language using only approved facts.
2. Ensure privacy, terms, and contact paths are visible and coherent site-wide.
3. Standardize nonprofit / 501(c)(3) wording where it matters most.
4. Add or tighten no-cost-to-members and laptop-support language where operationally relevant.
5. Keep logos in place, but make surrounding context clearer if needed.

**Exit criteria**
- A skeptical first-time visitor can tell the organization is real and responsibly presented.
- Trust improves without adding inflated or unverifiable claims.

## Workstream 3: Funnel truth pass (P1)

**Primary files / surfaces to inspect**
- `app/(decision-journey)/find-your-path/page.tsx`
- `app/apply/page.tsx`
- `app/apply/ApplyFlowClient.tsx`
- `app/apply/results/ApplyResultsClient.tsx`
- `app/(decision-journey)/programs/page.tsx`
- `app/(decision-journey)/programs/[slug]/page.tsx`

**Tasks**
1. Verify `find-your-path` recommendations and framing feel intentional, not random.
2. Tighten results/apply copy so it explains what happens next without overpromising.
3. Check CTA order and consistency across homepage, programs, pathfinder, and apply.
4. Confirm any laptop/no-cost language matches real downstream behavior.

**Exit criteria**
- Pathfinder and apply flow feel coherent and operationally true.
- Primary CTA journeys do not create false expectations.

## Workstream 4: Restrained homepage and high-scrutiny page cleanup (P1)

**Primary files / surfaces to inspect**
- `app/page.tsx`
- `app/employers/page.tsx`
- `app/partners/page.tsx`
- `app/impact/page.tsx`
- `app/contact/page.tsx`
- `app/leadership/page.tsx`
- `app/what-we-do/page.tsx`

**Tasks**
1. Make homepage clarity edits only where they reduce vagueness or trust leaks.
2. Preserve existing logo treatment and overall homepage stance.
3. Tighten employers, partners, impact, contact, leadership, and what-we-do pages for specificity and credibility.
4. Remove or soften vague, inflated, or awkward wording.

**Exit criteria**
- Public-facing pages read more clearly and credibly.
- Homepage is improved, not reinvented.

## Workstream 5: Portal hardening (only after public P0/P1 work)

**Primary files / surfaces to inspect**
- portal admin/member action surfaces with destructive actions or async states

**Tasks**
1. Add confirmation for destructive actions.
2. Add missing loading/success/error states on critical async flows.
3. Clean up obvious naming inconsistencies only if they are trust-breaking.

**Exit criteria**
- Internal product trust improves without displacing higher-priority public work.

## Recommended sprint order
1. Public reliability sweep
2. Footer/trust layer
3. Funnel truth pass
4. Restrained homepage cleanup
5. High-scrutiny public pages
6. Portal hardening if time remains

## Verification checklist
- Run `npm run build`
- Smoke test `/`, `/blog`, representative `/blog/[slug]`, `/faq`, `/program-comparison`, `/find-your-path`, `/apply`, `/privacy`, `/terms`, `/partners`, `/employers`, `/impact`, `/contact`
- Verify no homepage/logo regressions
- Verify trust copy stays within approved bounds

## Launch-blocker definition for this sprint
A task is a blocker if it causes one of the following:
- public 500 or blank page
- broken core CTA journey
- copy that creates avoidable trust/compliance risk
- missing legal/trust navigation on core public surfaces

## Final direction
This sprint should make WorkforceAP feel more real, more stable, and more trustworthy, without drifting into a homepage redesign or claim inflation.
