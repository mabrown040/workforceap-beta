---
name: design-review
description: Designer's-eye QA for WorkforceAP — finds visual inconsistency, spacing/hierarchy problems, AI-slop patterns, and slow interactions, then fixes them iteratively with before/after evidence. Use when asked to "audit the design", "visual QA", "design polish", or before shipping significant UI.
---

# Design Review — Audit → Fix → Verify

Adapted for this repo from [garrytan/gstack](https://github.com/garrytan/gstack)
`design-review` v2.0.0 (MIT). The gstack-/Claude-Code-specific machinery (preambles,
`$B` browser bins, telemetry, gbrain) is replaced with this environment's tooling;
the design methodology is preserved verbatim where possible.

## How to run it here

1. **Environment:** start Postgres + seed, `npm run build && npm start` (see AGENTS.md).
   Evaluate rendered pages via the computer-use browser; screenshot every finding.
   Credential-free surfaces: `/en/*` marketing, `/dev/kit`, `/dev/astryx/*`, `/dev/*` proofs.
2. **Both themes, three viewports.** Light + dark (`localStorage wap-theme`), mobile 375 /
   tablet 768 / desktop 1440. A stacked desktop layout on mobile is NOT responsive design.
3. **Fix loop:** for each finding — locate source → fix → commit atomically → re-screenshot →
   classify fixed/partial/regression. Depth over breadth: 5–10 documented findings with
   screenshots beat 20 vague observations. Always end with a "Quick Wins" list (3–5 fixes
   under 30 minutes each).
4. **House rules that override generic advice:** semantic tokens only
   (`docs/KIT_GUIDE.md` — `--wa-*` for kit surfaces, Astryx tokens for Astryx surfaces;
   never raw hex — ESLint enforces this in `components/portal/kit/**`); status-tone
   semantics (`alert` vs `danger`) are deliberate; `statusColors.ts` magenta `danger` is
   intentional; icons are lucide-react on kit surfaces.

## Critique format

Structured feedback, not opinions: "I notice…" (observation), "I wonder…" (question),
"What if…" (suggestion), "I think… because…" (reasoned opinion). Every finding:
impact rating (high / medium / polish), category, screenshot, and a specific
"change X to Y because Z".

## UX Principles: How Users Actually Behave

### The Three Laws of Usability
1. **Don't make me think.** Every page should be self-evident. If a user stops to think
   "What do I click?" or "What does this mean?", the design has failed.
2. **Clicks don't matter, thinking does.** Three mindless, unambiguous clicks beat one
   click that requires thought.
3. **Omit, then omit again.** Get rid of half the words on each page, then half of what's
   left. Happy talk must die. Instructions must die.

### How users behave
- **Users scan, they don't read.** Design billboards, not brochures: visual hierarchy,
  clearly defined areas, headings, highlighted key terms.
- **Users satisfice.** They pick the first reasonable option. Make the right choice the
  most visible choice.
- **Users muddle through.** Once something works, however badly, they stick to it.
- **Users don't read instructions.** Guidance must be brief, timely, and unavoidable.

### Billboard design
- **Use conventions** (logo top-left, nav top/left, search = magnifying glass). Innovate
  only when you KNOW you have a better idea.
- **Visual hierarchy is everything.** Related = grouped, nested = contained, important =
  prominent. If everything shouts, nothing is heard.
- **Clickable things must look clickable** without hover (mobile has no hover).
- **Eliminate noise:** shouting, disorganization, clutter. Fix by removal, not addition.
- **Clarity trumps consistency.**

### Navigation as wayfinding
Navigation must always answer: What site? What page? What are the major sections? What
are my options here? **Trunk test:** cover everything except navigation — you should
still know site, page, and sections.

### The Goodwill Reservoir
Depletes: hiding info users want, punishing format deviations, asking for unnecessary
data, sizzle in the way, sloppy appearance. Replenishes: making the next step obvious,
answering questions upfront, saving steps, easy error recovery.

### Mobile
Same rules, higher stakes: visible affordances (no hover), ≥44px touch targets, ruthless
prioritization. Never sacrifice usability for space savings.

## Design Audit Checklist (10 categories)

Apply per page; rate each finding high/medium/polish.

**1. Visual hierarchy & composition** — one focal point and one primary CTA per view;
eye flows top-left→bottom-right; no competing noise; above-the-fold communicates purpose
in 3s; squint test; white space intentional.

**2. Typography** — ≤3 fonts; scale follows a ratio (1.25/1.333); line-height 1.5 body /
1.15–1.25 headings; 45–75 chars per line; no skipped heading levels; ≥2 weights;
`text-wrap: balance` on headings; curly quotes; `…` not `...`; `tabular-nums` on number
columns; body ≥16px; captions ≥12px; no letterspacing on lowercase.

**3. Color & contrast** — coherent palette (≤12 non-grays); WCAG AA (4.5:1 body, 3:1
large text/UI); consistent semantic colors; no color-only encoding; dark mode uses
elevation not lightness inversion, off-white text (~#E0E0E0) not pure white, accent
desaturated 10–20%, `color-scheme: dark` present; no red/green-only pairs; neutrals
consistently warm or cool.

**4. Spacing & layout** — consistent grid at all breakpoints; spacing on a 4/8px scale;
consistent alignment; rhythm (related closer, sections further); border-radius hierarchy
(inner = outer − gap); no horizontal scroll on mobile; max content width; safe-area
insets; URL reflects state; breakpoints 375/768/1024/1440.

**5. Interaction states** — hover on everything interactive; `focus-visible` ring (never
bare `outline: none`); active/pressed state; disabled = opacity + `not-allowed`; skeletons
match real layout; warm empty states (message + action + visual); specific error messages
with next step; touch targets ≥44px; `cursor: pointer`; **mindless-choice audit**: any
decision point requiring thought is HIGH.

**6. Responsive** — mobile layout makes *design* sense; nav collapses appropriately;
correct input types; images responsive; no `user-scalable=no`.

**7. Motion** — ease-out enter / ease-in exit; 50–700ms; every animation communicates;
`prefers-reduced-motion` respected; no `transition: all`; animate only `transform`/`opacity`.
(House: use `--wa-dur-*` + `--wa-ease` tokens on kit surfaces.)

**8. Content & microcopy** — specific button labels ("Save API key" not "Submit"); no
lorem ipsum; truncation handled; active voice; "Saving…" with the ellipsis character;
destructive actions confirmed or undoable; **happy-talk detection** ("Welcome to…",
self-congratulation — flag for deletion); visible instructions longer than one sentence =
flag the instructions AND the interaction they compensate for.

**9. AI slop blacklist** (would a designer at a respected studio ship this?)
1. Purple/violet/indigo gradients or blue-to-purple schemes
2. The 3-column feature grid (icon-in-circle + title + 2 lines, ×3 symmetric)
3. Icons in colored circles as decoration
4. Centered everything
5. Uniform bubbly border-radius on every element
6. Decorative blobs / wavy SVG dividers (empty section ⇒ better content, not decoration)
7. Emoji as design elements
8. Colored left-border cards
9. Generic hero copy ("Unlock the power of…", "Your all-in-one solution…")
10. Cookie-cutter section rhythm (hero → 3 features → testimonials → pricing → CTA)
11. system-ui as PRIMARY display font — the "I gave up on typography" signal

**10. Performance as design** — LCP <2.0s; CLS <0.1; skeleton shapes match content;
lazy images with dimensions; `font-display: swap`; no FOUT on critical fonts.

## Design Hard Rules

**Classify first:** MARKETING/LANDING (brand-forward, conversion) vs APP UI (data-dense,
task-focused) vs HYBRID (apply each rule set to its sections).

**Hard rejections (instant fail):** generic SaaS card grid as first impression; beautiful
image with weak brand; strong headline with no clear action; busy imagery behind text;
sections repeating one mood statement; purposeless carousel; app UI made of stacked cards
instead of layout.

**Litmus (YES/NO):** brand unmistakable in first screen? one strong visual anchor?
understandable by scanning headlines only? each section one job? are cards actually
necessary? does motion improve hierarchy? still premium with decorative shadows removed?

**Landing rules:** first viewport is one composition (a poster, not a document);
brand > headline > body > CTA; expressive typography (no default stacks); no flat
single-color backgrounds; full-bleed hero with a strict budget (brand, one headline, one
sentence, one CTA group, one image); no cards in hero; 2–3 intentional motions; one
accent color; "if deleting 30% of the copy improves it, keep deleting".

**App UI rules:** calm surface hierarchy, strong typography, few colors; dense but
readable, minimal chrome; primary workspace + navigation + secondary context + one
accent; avoid dashboard-card mosaics, thick borders, decorative gradients, ornamental
icons; utility copy (orientation, status, action); cards only when the card IS the
interaction; section headings state what the area is or does.

**Universal:** CSS variables for color; no default font stacks; one job per section;
cards earn their existence; never body text <16px or contrast <4.5:1; never
placeholder-as-only-label; preserve visited-link distinction; headings sit closer to the
section they introduce.

## Important rules

1. Think like a designer, not a QA engineer — "works" is not the bar; intentional is.
2. Screenshots are evidence; every finding gets one, shown inline to the user.
3. Be specific and actionable.
4. Evaluate the rendered site, not the source. (Exception: locating a fix.)
5. AI-slop detection is the superpower — be direct about it.
6. Quick wins always included.
7. Depth over breadth; document incrementally.
