# WorkforceAP marketing site — guide for AI agents (read this first)

This is the **public marketing front** of WorkforceAP, built in **Astro** (static,
zero-JS by default). The logged-in portal/app is a **separate Next.js** project —
do not touch app/auth/data logic here; this repo is marketing pages only.

You can build or edit a page by **composing the component kit below**. You almost
never need to write raw HTML/CSS. Keep it simple.

## Golden rules (do not break)
1. **Truth-lock (501(c)(3) nonprofit).** NEVER invent statistics, percentages,
   outcomes, salary numbers, member counts, or testimonials with named people.
   Only use real facts: *25+ years, 501(c)(3), $0 for qualifying members,
   certs IBM/Google/Microsoft/AWS/CompTIA, apply ~5 minutes, a real team reviews
   and follows up in 1–2 business days, programs are employer-aligned.* If you
   need a new claim, STOP and ask a human.
2. **Light theme only.** Use the brand tokens; never add a dark mode here.
3. **Reuse the kit + tokens.** Don't hardcode colors — use the CSS variables.
4. **Every change must build.** Run `npm run build` and make sure it passes
   before you're done.

## Brand tokens (in `src/styles/blend.css`, available everywhere)
`--crimson #ad2c4d` (primary) · `--accent-dark #8c0f37` · `--gold #a47f38` ·
`--blue #2b7bb9` · `--green #4a9b4f` · `--bg #f7f4f1` · `--surface #fff` ·
`--text` · `--muted` · `--border`. Fonts: Inter (body) + Plus Jakarta Sans (headings).
Button classes: `btn btn--primary` / `btn--ghost` / `btn--light` / `btn--translucent`.

## The component kit (`src/components/ui/`)
| Component | What it is | Key props |
|---|---|---|
| `Layout` (`src/layouts/Layout.astro`) | page shell: nav + footer + fonts | `title`, `description`, `lang` |
| `Section` | a vertical band (wrap each block) | `surface` (white bg), `id`, `narrow` |
| `SectionHead` | centered eyebrow + heading + subtitle | `eyebrow`, `title`, `titleAccent`, `subtitle` |
| `Pill` | the gold badge | child text; `tone` gold\|crimson |
| `Card` | surface card w/ icon, title, body, link | `title`, `body`, `icon`, `tone`, `href`, `cta` |
| `Grid` | responsive grid for cards | `cols` 2\|3\|4 |
| `Cta` | crimson closing call-to-action band | `title`, `copy`, `primary {href,label}`, `secondary` |

## Recipe: add a new page
1. Create `src/pages/<name>.astro` (it becomes the route `/<name>`).
2. Paste this template and edit the text (real copy only):

```astro
---
import Layout from '../layouts/Layout.astro';
import Section from '../components/ui/Section.astro';
import SectionHead from '../components/ui/SectionHead.astro';
import Grid from '../components/ui/Grid.astro';
import Card from '../components/ui/Card.astro';
import Cta from '../components/ui/Cta.astro';
---
<Layout title="Page title — WorkforceAP" description="One real sentence.">
  <Section>
    <SectionHead eyebrow="Eyebrow" title="Real heading" titleAccent="accent words"
      subtitle="One real sentence of supporting copy." />
    <Grid cols={3}>
      <Card icon="📄" tone="crimson" title="Real title" body="Real description." href="/apply" cta="Learn more" />
      <Card icon="🎙️" tone="gold" title="Real title" body="Real description." />
      <Card icon="🧭" tone="blue" title="Real title" body="Real description." />
    </Grid>
  </Section>

  <Cta title="Your next step starts with one application."
    copy="Apply in about 5 minutes — no cost for qualifying members. A real team reviews it and follows up in 1 to 2 business days."
    primary={{ href: '/apply', label: 'Start your application' }}
    secondary={{ href: '/find-your-path', label: 'Find your path' }} />
</Layout>
```

3. Run `npm run build`. If it passes, you're done. Look at `src/pages/index.astro`
   for a full real example, and any `src/pages/v/*.astro` for design variants.

## Interactivity (rare)
Static HTML is the default. Only when a page genuinely needs interactivity (a
form, a toggle) add a React island in `src/components/*.tsx` and use it with
`client:visible` — see `src/components/EligibilityForm.tsx` used in
`src/pages/apply.astro`. Keep islands small; everything else stays static.

## i18n
Real translations live in `src/i18n/{en,es,fr,pt}.json`; use `useT(lang)` from
`src/i18n/t.ts` (`t('nav.programs')`). Missing keys fall back to English. See
`src/components/Home.astro` + `src/pages/[lang]/index.astro` for the pattern.

## Commands
- `npm run dev` — local preview (hot reload)
- `npm run build` — **must pass before finishing**
- `npm run preview` — serve the built site
