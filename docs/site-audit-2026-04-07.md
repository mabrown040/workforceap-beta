# WorkforceAP site audit — 2026-04-07

## Scope

- Public marketing routes reviewed live on desktop and mobile: `/`, `/programs`, `/program-comparison`, `/salary-guide`, `/find-your-path`, `/apply`, `/how-it-works`, `/employers`, `/partners`, `/contact`, `/faq`, `/leadership`, `/blog`.
- Shared shell reviewed: `app/layout.tsx`, `components/MainNav.tsx`, `components/Footer.tsx`, `css/main.css`, `next.config.ts`.
- Portal follow-up reviewed from source for the reported resume rewriter issue at `/dashboard/ai-tools/resume-rewriter`.

## Evidence used

- Manual browser audit on localhost across desktop and mobile.
- Playwright desktop route guardrails on public pages and unauth portal redirects.
- Source inspection for shared navigation, auth, and resume tool workflow.

## Executive summary

The public site is generally coherent and already stronger than a basic marketing rebuild, but the audit surfaced four practical gaps:

1. Public pages rely on an auth probe in the main nav that should fail quietly, not emit server errors when Supabase env is absent locally.
2. Protected-route redirects can momentarily show an empty loading shell instead of the actual sign-in experience.
3. The resume rewriter wrapper used control-like UI that implied an interactive voice/text selector before the real workflow chooser appeared.
4. The conversion stack is good, but CTA priority, mobile density, and perceived performance still need another polish pass before the site feels fully launch-ready.

## Verified findings

### P0 — misleading product affordance

#### Resume rewriter wrapper implied a non-functional mode selector

- Route: `/dashboard/ai-tools/resume-rewriter`
- Status: fixed in this branch
- Problem: the page rendered decorative chips and labels that looked interactive while a separate client component handled the real workflow selection. Supporting copy said “Use voice or text mode inside the tool,” which matched the reported confusion.
- Fix shipped here: the wrapper now presents a workflow summary instead of fake controls, and the explanatory copy tells users to choose voice coach or text rewrite in the tool below.

### P1 — platform / shell issues

#### Public nav auth probe degraded poorly without Supabase env

- Area: `components/MainNav.tsx` calling `/api/auth/me`
- Status: fixed in this branch
- Problem: when local Supabase env was missing, `/api/auth/me` threw a fatal server error instead of quietly treating the user as signed out. This polluted logs during public-page browsing and made local QA noisier than necessary.
- Fix shipped here: server auth helpers now return `null` when Supabase env is missing, and `/api/auth/me` returns the anonymous nav state without logging an error for that case.

#### Protected-route redirects could show a blank loading shell

- Routes observed: unauth `/dashboard`, `/employer`, `/admin`
- Status: fixed in this branch
- Problem: redirect flows could briefly render a generic “Loading...” fallback instead of the actual login shell, which weakened trust and caused the guardrail test to capture an incomplete state.
- Fix shipped here: the login page now passes the sanitized redirect target from the server directly into `LoginForm`, avoiding the client suspense dependency for this render path.

#### Next.js image quality warning on core shell assets

- Area: nav/footer/error surfaces
- Status: fixed in this branch
- Problem: repeated warnings appeared for `quality={85}` image usage because `images.qualities` was not configured. This will become stricter in Next 16 and added noise to every route audit.
- Fix shipped here: added an explicit `images.qualities` allowlist in `next.config.ts`.

### P1 — desktop UX findings

#### CTA priority is still split across too many peer actions

- Most visible on homepage hero and some inner-page hero/action clusters.
- “Find your path,” “Apply now,” and audience-specific actions all compete at near-primary weight.
- Recommendation: establish one primary CTA per page and one audience-specific secondary path.

#### Route transitions feel slower than they should

- During manual review, route changes often updated URL state before content visually settled.
- This reads as hydration or client-side shell lag even when the final route is correct.
- Recommendation: trim client work in shared shell, defer non-critical analytics/init work, and add route-level loading states only where they improve clarity.

#### Desktop navigation is information-rich but still slightly over-complex

- The `About Us` grouping helps reduce top-level noise, but the combined dropdown + login split-menu pattern still demands high precision.
- Recommendation: simplify dropdown/flyout interaction rules and tighten active-state clarity for sign-in versus portal entry.

### P1 — mobile UX findings

#### Mobile density is improved but still crowded in some stacked sections

- Homepage and programs pages work, but card spacing and section breaks are still tighter than ideal for fast scanning.
- Recommendation: add a stricter mobile spacing rhythm for stacked cards and CTA rows below 640px.

#### Bottom navigation needs another usability pass

- The fixed mobile bottom nav is helpful, but icon-led navigation still competes with page CTAs and can feel cramped on smaller viewports.
- Recommendation: validate tap target sizes, label legibility, and overlap with in-page CTAs on short-height devices.

#### Hero typography remains aggressive on narrow widths

- Headline scale is visually strong, but some heroes still feel one step too large on smaller screens.
- Recommendation: tighten mobile `clamp()` ranges and preserve more breathing room above first-action content.

### P2 — route-specific content and conversion opportunities

#### Homepage

- Strong message and trust scaffolding.
- Opportunity: reduce CTA rivalry and make the intended primary path more obvious for first-time visitors.

#### Programs

- Solid page structure and filtering.
- Opportunity: increase “best for” and outcome framing above the fold, especially on mobile.

#### Program comparison

- Good decision-support direction.
- Opportunity: make the decision guide more prominent before users hit dense comparison content.

#### Salary guide

- Desktop presentation is strong.
- Opportunity: keep compressing mobile chrome and make “what should I do next?” even more explicit after the salary content.

#### Find your path

- Quiz structure is promising.
- Opportunity: raise confidence-building copy and next-step actions after the result state.

#### Apply

- Strong funnel intent.
- Opportunity: reduce any perception that the form is “stuck loading” by making progress/loading states more explicit and reassuring.

#### Employers / Partners

- Good directional trust and audience targeting.
- Opportunity: sharpen proof and commitments further so the value proposition feels more commercial and less descriptive.

#### Blog

- Empty state is acceptable.
- Opportunity: if content remains sparse, use featured conversion/support content instead of a mostly empty publishing shell.

## Comprehensive fix plan

### Track 1 — conversion and messaging polish

1. Set a single primary CTA per page.
2. Standardize hero action hierarchy across homepage, programs, salary guide, comparison, employers, and partners.
3. Add stronger “who this is for / what happens next” framing directly under key hero sections.

### Track 2 — mobile-first polish

1. Tighten hero scale and top padding below 640px.
2. Normalize stacked card spacing and CTA row spacing.
3. Recheck all fixed mobile navigation elements against page CTAs and safe-area behavior.
4. Validate 44px+ tap targets for all primary actions and menu controls.

### Track 3 — perceived performance

1. Reduce non-essential shared-shell client work.
2. Audit `app/layout.tsx` dependencies loaded on every route.
3. Defer or gate analytics/portal probes that are not required for first paint.
4. Optimize oversized always-visible assets like shared logos.

### Track 4 — trust and proof

1. Increase explicit employer-alignment and outcomes framing on audience pages.
2. Replace any generic or placeholder-feeling proof with concrete commitments and real examples.
3. Ensure all conversion pages end with one decisive next step and one fallback action.

### Track 5 — portal follow-up

1. Fully retest authenticated AI tools once local Supabase env is configured.
2. Audit all portal wrappers for decorative UI that looks interactive.
3. Verify voice/text mode clarity and state persistence across resume, interview, and counselor tools.

## Optimization backlog

### High impact

- Compress shared logo/image payloads further.
- Remove unnecessary public-route auth chatter from the main shell.
- Unify CTA language and ordering site-wide.

### Medium impact

- Add targeted route-level loading states where slow transitions are noticeable.
- Tighten mobile section spacing and hero sizing.
- Revisit mobile bottom nav ergonomics.

### Lower impact

- Expand blog empty state into a richer content hub if editorial volume stays low.
- Further simplify multi-audience navigation labels once launch priorities stabilize.

## Follow-up needed to finish the portal audit

Authenticated portal end-to-end validation is still blocked locally because the workspace only contains `.env.example`; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not configured in the active environment. Once those are present, rerun:

- login flow smoke tests
- resume rewriter voice/text workflow
- AI tools history surfaces
- employer / admin portal route checks
