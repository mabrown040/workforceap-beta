# Member ICP copy & UX audit — low-income, mobile-first, institution-skeptical audience

**Scope:** Code and strings in `wap-repo` as of this review. Primary surfaces: public marketing (`app/page.tsx`, `/programs`, `/apply`), member portal dashboard and AI hub.

**Scoring:** Each row is 1–10 (10 = strongest for this ICP). Dimensions: **Clarity** (stressed reader gets it fast), **Trust** (safe, not salesy), **Actionability** (obvious next physical step), **Mobile** (slow data, small screen, touch).

---

## 1. Homepage hero

| Dimension | Score | Notes |
|-----------|------:|-------|
| Clarity | 5 | H1 is abstract brand positioning, not a concrete promise. |
| Trust | 6 | Qualified funding bullets help; first body paragraph reads institutional. |
| Actionability | 7 | Numbered pills + primary CTA to Find Your Path are clear. |
| Mobile | 7 | `marketing.css` reserves space so hero content sits above the fixed bottom nav (`--wap-mobile-bottom-nav-clearance` on `.home-hero`). |

**What works**

- Trust line trio uses qualified language: `marketing.home.trustGrant` / `trustNoCost` → “Workforce Funded Training for qualified members” (`messages/en.json`).
- Steps are operational: quiz → programs → counselor follow-up.

**Gaps for this ICP**

- **Abstract empowerment:** `heroTagline` + `heroTaglineAccent` (“Empowering People.” / “Advancing Futures.”) does not sell *safety* or *specificity*; it sounds like every other workforce site.
- **Cognitive load:** `heroBody1` packs 501(c)(3), “AI-powered,” multiple program types, and funding into one long sentence — easy to skim past or distrust as “too much at once.”

**Specific copy changes (EN)**

1. **Replace or demote the H1** — keep brand in a subline if needed, lead with outcome + guardrails:

   - *Current:* “Empowering People. Advancing Futures.”
   - *Suggest:* “Train for a real job — **we check funding fit before you owe anything.**” (accent span on the second half), or “**Free training if you qualify** — real certificates, real people following up.”

2. **Split `heroBody1` into two short sentences** — first: who you are + geography + nonprofit; second: what they get in plain words. Drop “AI-powered” above the fold or move to the AI section.

3. **Reorder trust row** so the most anxiety-reducing phrase comes first for “hidden cost” fear — e.g. “No credit card · **We’ll tell you if you qualify before you commit** · Workforce-funded pathways for eligible members.”

**Specific copy changes (ES)**

- `heroTagline` / `heroTaglineAccent`: mirror the EN change; avoid “Empoderando…” as the only emotional frame. Prefer “Capacitación con apoyo real” / “**sin tarjeta ni sorpresas — revisamos si calificas antes**.”

---

## 2. Apply flow

| Dimension | Score | Notes |
|-----------|------:|-------|
| Clarity | 7 | Strong server-translated hero and sidebar. |
| Trust | 8 | Honest about review, documents, and non-automatic decisions. |
| Actionability | 8 | Step labels, “Continue to step 2 — choose your programs →” is concrete. |
| Mobile | 7 | Grid stacks; eligibility uses large radio cards (E2E covers mobile). |

**What works**

- `apply.heroDesc` spells out *what* is collected (work situation, income, work authorization) and *what happens* (advisor in 1–2 business days).
- `ApplyEligibilityClient.tsx` states questions are for “funding fit,” **not** auto accept/deny — high trust for ashamed/unsure users.
- Live income threshold ($60k) and work-auth question are visible in the UI (not buried in PDFs).

**Gaps**

- **Localization gap:** `app/apply/ApplyEligibilityClient.tsx` is entirely **hardcoded English** (questions, buttons, banners, hints). A Spanish marketing visitor who lands on `/es/apply` still gets English in the highest-anxiety step — this breaks trust (“Did I get the real site?”).
- **Nav vs page:** Global `cta.applyNow` / `MainNav` “Apply Now” has no time/qualifier in the label (contrast with footer and hero sublines).

**Specific copy / code changes**

1. **Internationalize** `ApplyEligibilityClient` — move `ELIGIBILITY_QUESTIONS`, progress label, kicker, banners, and button text into `messages/en.json` / `es.json` under e.g. `apply.eligibility.*`.

2. **Nav CTA (optional but high impact):** In `MainNav` / `cta`, use something like “Apply (≈10 min, no fee)” or “Start application — **no charge to apply**” instead of bare “Apply Now.”

3. **Button microcopy:** Change “Continue to step 2 — choose your programs →” to **“See program options next (you can pick ‘not sure yet’) →”** — reduces fear of locking in the wrong choice.

---

## 3. Programs page (`app/(decision-journey)/programs/page.tsx`)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Clarity | 6 | Multiple on-ramps (quick start, anchors, pathfinder, comparison, salary). |
| Trust | 6 | In-page `heroDesc` is qualified; **SEO metadata is not.** |
| Actionability | 6 | Many valid CTAs; pathfinder helps, but still easy to feel lost. |
| Mobile | 7 | Chip row to jump sections; substantial vertical content. |

**What works**

- `marketing.programs.heroDesc`: “offered through Workforce Funded Training for qualified members…”
- Quick start lanes and “Not sure?” pathfinder reduce paralysis for some users.

**Gaps**

- **Trust inconsistency:** `generateMetadata()` description strings say “at **no cost to members**” and “Nationwide pathways supported by grants and partnerships” — “no cost to members” without “qualifying” matches the exact fear pattern (fine print trap). ES page metadata should be checked the same way.
- **Choice architecture:** Hero already has two buttons; lower sections add compare + salary chips — cognitively heavy for a stressed user.

**Specific copy changes**

1. **Metadata (EN):** Replace “at no cost to members” with “**through Workforce-funded training for members who qualify** — no tuition charged to eligible participants” (or shorter: “no tuition for qualifying members; funding varies by pathway”).

2. **Single primary directive above the catalog:** One line under the hero, e.g. “**Not sure yet?** Do the 2-minute pathfinder first — or scroll to browse all programs.” (You already imply this; making it the *one* funnel default reduces paralysis.)

---

## 4. Member dashboard (`app/(portal)/dashboard/page.tsx` + `DashboardHomeClient.tsx`)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Clarity | 5 | Many blocks: hero ring, NBA, journey, points, carousels, quick actions. |
| Trust | 7 | Counselor-human language in several strings; streak/stuck strips help. |
| Actionability | 6 | Strong when `dashboardState === 'A'` (single gradient card); weaker when multiple NBA + journey + widgets compete. |
| Mobile | 8 | Portal omits fixed bottom nav (`MobileBottomNav` variant `portal` is a no-op). |

**What works**

- State **A**: one dominant card — “Apply now — 10 minutes” + qualified subcopy (`dashboard.applyNowTenMinutes`, `careerTrainingNoCost`) — good actionability.
- `MemberDoThisNextCard` surfaces a primary next action when populated.
- `trainingProgressBlends` explains xAPI vs manual completion — transparency for skeptical users **if** they read it.

**Gaps**

- **Competing priorities:** After state A, users can see NBA card, horizontal “next milestones,” application journey `<details>`, points widget, quick actions 2×2, voice section, AI activity — multiple “next” concepts.
- **English leaks in localized experience:** Hardcoded `"Priority Action"` on mobile application card (`dashboard/page.tsx` ~824); `"Active program"` (~1135); `"How to earn points"` (~910); `PointsWidget.tsx` ~160 — undermines Spanish (and trust).
- **Gamification sensitivity:** Points copy (“Your first points are waiting”) can feel gimmicky or “app-like” vs. sober workforce programs for ashamed users — not necessarily wrong, but higher risk than plain “Complete one small step.”

**Specific copy changes**

1. Add i18n keys for every hardcoded dashboard string above; use existing `dashboard.priorityAction` (key already exists) instead of literal `"Priority Action"`.

2. **Tier actions visually:** Always one “Today:” block (single sentence + one button); move journey + points below fold or collapsed by default for states B/C.

3. **Points widget:** Rename link from “How to earn points” to **“What counts toward your milestones (optional)”** or tie to counselor outcome language.

---

## 5. AI tools entry (`app/(portal)/dashboard/ai-tools/page.tsx`)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Clarity | 6 | Hub is structured but dense; many tool rows. |
| Trust | 5 | “Beta Access” badge and vendor name can trigger “experiment on me.” |
| Actionability | 7 | “Start here” enrollment card + history link are good anchors. |
| Mobile | 7 | `wa-pb-24` adds bottom breathing room when needed. |

**What works**

- `dashboard.aiToolkitDescription` mentions Workforce-funded training for qualified members (SEO/description path).
- Path to `/dashboard/job-applications` for tracker avoids dead-end confusion.

**Gaps**

- **Public marketing vs portal:** Homepage AI section ties tools to `/apply` (`marketing.home.aiCta`: “Apply for Member Tools”) — reasonable, but reinforces “gate” without stating “no surprise charges; tools included if you’re in the program.”
- **`marketing.blog.betaAccess`:** “Beta Access” is honest but **Reduces perceived safety** for low-trust users. “Included for members” (`includedForMembers`) does not repeat **qualifying** framing on the hub.

**Specific copy changes**

1. Replace or qualify **Beta**: e.g. “**Pilot tools** — feedback helps us improve. **No extra fee for members.**”

2. Under the title, add one sentence: **“These tools don’t replace your counselor; they supplement what we already offer at no extra charge.”**

3. Align `includedForMembers` ES/EN: use “**Sin costo adicional para miembros dentro del programa** (la capacitación sigue siendo según financiamiento y elegibilidad)” rather than implying blanket gratuity.

---

## 6. Mobile UX (cross-cutting)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Overall | 7 | Thoughtful clearance for marketing bottom nav; portal uses top pattern. |

**Findings**

- **Bottom nav vs CTAs (marketing):** `css/marketing.css` explicitly pads `.home-hero` and `#main-content` so CTAs are not obscured — **good**.
- **Homepage length:** `minHeight: min(85vh, 820px)` hero + many sections → **scroll fatigue** on slow connections; prioritize lazyBelowFold if not already done.
- **Touch targets:** `Footer.tsx` links use `minHeight: '44px'` — good pattern; ensure all marketing `btn-small` usages still hit ≥44px where they are lone CTAs (`member-all-routes` / visual tests can guard this).
- **Apply funnel:** `/apply` omits bottom nav (`mobileBottomNavLayout.ts`) except confirmation — avoids double chrome; **good**.

---

## 7. Trust signals — “no cost” / grants / partnerships

**Consistent**

- Homepage trust row (`trustNoCost`), member cards (`memberCardNoCost`), footer `copyright`/`fundedBy`, dashboard strings repeatedly use **qualified** language.
- Homepage contrast stripe EN #2 mentions grants/partners (“we're funded by grants and partners…”).

**Inconsistent / risky**

- **Programs SEO** (section 3): “no cost to members.”
- **English contrast stripe:** `marketing.home.contrast2` ends with “**no cost to you**” while Spanish (`es.json`) stays tighter: “capacitación financiada por Workforce para **miembros calificados**.” Align EN with ES precision.
- **Stats block:** `statNoCost`: “No-cost for qualifying members” is good; ensure every surface that says “free” cites **qualifying** or **funded pathway** in the same glance.

**Specific copy**

- **EN `contrast2`:** Append “**for eligible participants**” or replace “no cost to you” with “**no tuition charged to qualifying members.**”

---

## 8. Spanish trust framing (`messages/es.json` vs intent)

**Stronger alignment**

- `marketing.home.ctaCopy` uses capacitación financiada por Workforce para miembros calificados — matches English qualified pattern.
- `marketing.home.contrast2` avoids a standalone “gratis para todos” implication.

**Weaker vs English / ICP-safe bar**

- **`marketing.blog.includedForMembers`:** “Incluido para miembros” reads like blanket inclusion; does not carry funding nuance. Prefer: “**Sin costo adicional dentro del programa (según financiamiento y elegibilidad)**” or “**Incluido en tu camino como miembro** — sin tarjeta de crédito.”
- **`nav.apply`:** “Solicitar” alone is terse; pairing with reassurance in subtitles matters (same as EN nav).
- **Religious/org framing:** `marketing.home.aboutBody1` (Vision / Michael Brown) duplicates EN; some institution-skeptical users disconnect here — consider a **member-facing** version that stays mission-light above the fold (keep detailed story deeper on Leadership).

**Structural issue**

- Apply flow UX copy in Spanish cannot land until `ApplyEligibilityClient` is translated.

---

## Summary scorecard

| Surface | Clarity | Trust | Actionability | Mobile |
|---------|--------:|------:|--------------:|-------:|
| Homepage hero | 5 | 6 | 7 | 7 |
| Apply flow | 7 | 8 | 8 | 7 |
| Programs page | 6 | 6 | 6 | 7 |
| Dashboard | 5 | 7 | 6 | 8 |
| AI tools hub | 6 | 5 | 7 | 7 |
| Trust signals (site-wide consistency) | — | **6** (metadata + EN contrast2 drag this down) | — | — |
| Spanish parity | — | **5** (apply client + toolkit label + leaks) | **5** | **6** |

---

## Highest-leverage fixes (ordered)

1. Internationalize **`ApplyEligibilityClient`** — biggest Spanish trust/clarity gap.
2. Rewrite homepage **H1 + first paragraph** toward safety, specificity, and shorter sentences.
3. Fix **`/programs` metadata** and **EN `contrast2`** to remove blanket “no cost to members/you.”
4. Remove dashboard **hardcoded English** strings; one visual “today” hierarchy.
5. Soften/reframe **AI “Beta Access”** and align **“Included for members”** with qualified, no-surprise-price language.
