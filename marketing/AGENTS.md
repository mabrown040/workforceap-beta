# WorkforceAP marketing authoring guide

This directory is the active Astro marketing package inside the WorkforceAP repository. The root Next.js application owns dynamic journeys, authentication and API handlers. Start with the [central knowledge base](../docs/knowledge-base/README.md), [architecture](../docs/knowledge-base/architecture.md) and [build routing](../docs/knowledge-base/operations.md#build-routing). Keep a marketing-only task within this directory unless its scope explicitly includes application behavior.

The root [Vercel build script](../scripts/vercel-build.cjs) validates its environment, installs and builds this package, copies `marketing/dist/` into root `public/`, then runs the selected Next build. Astro pages are build inputs; the presence of a filename does not prove which implementation serves an overlapping deployed URL. Do not point Astro's output directory at `public/`: Astro clears its output directory during builds.

## Authoring rules

1. **Keep claims truthful.** Preserve approved nonprofit and qualifying-member copy. Do not invent statistics, outcomes, salaries, member counts, named testimonials, eligibility promises or response times. Verify a new claim with its source and the responsible human before publishing it.
2. **Keep the light theme and brand tokens.** Reuse the styles below; do not add a dark mode or hardcode a new palette.
3. **Reuse actual source.** Compose semantic HTML with the existing layout, icons and CSS classes. Check that a component and its props exist before importing it.
4. **Check the whole URL.** Before adding or renaming a page, inspect both framework route sources, redirects and middleware. Preserve the active worker's ownership and existing application contracts.
5. **Validate the change.** For page/component/style changes, run the marketing build and check the affected page in a browser. A successful Astro build does not verify the combined Next deployment, API responses, forms or provider delivery. Documentation-only changes need source/link checks; report any validation that was not run.

## Existing building blocks

| Source | Use |
| --- | --- |
| [Layout.astro](src/layouts/Layout.astro) | Page document, navigation, footer, fonts and shared styles; optional `title`, `description`, `lang` props. It provides the main landmark and renders the default slot. |
| [Icon.astro](src/components/Icon.astro) | Shared decorative SVG icons; `name`, `size`, `class`. Choose a name from its `ICONS` map; give the surrounding control accessible text. |
| [Home.astro](src/components/Home.astro) | Existing translated home composition; see [index.astro](src/pages/index.astro) and [localized home](src/pages/%5Blang%5D/index.astro). |
| [CareerQuiz.tsx](src/components/CareerQuiz.tsx) | React island used by [career-quiz.astro](src/pages/career-quiz.astro). Inspect that source before changing scoring or hydration. |
| [FindYourPathQuiz.tsx](src/components/FindYourPathQuiz.tsx) and [InterestProfilerQuiz.tsx](src/components/InterestProfilerQuiz.tsx) | Existing interactive quiz flows, with distinct data/API behavior. |
| [AnalyticsHead.astro](src/components/AnalyticsHead.astro) and [ConsentBanner.astro](src/components/ConsentBanner.astro) | Already included by the layout; do not mount a second copy in each page. |

There is no `src/components/ui/` kit at this baseline. Use [blend.css](src/styles/blend.css) and real page compositions such as [career-quiz.astro](src/pages/career-quiz.astro); do not copy imports from historical component recipes.

`Layout` imports the shared [brand styles](src/styles/blend.css). Existing tokens include `--crimson`, `--accent-dark`, `--gold`, `--blue`, `--green`, `--bg`, `--surface`, `--text`, `--muted` and `--border`. Fonts are Inter for body text and Plus Jakarta Sans for headings. Reusable classes include `wrap`, `band`, `band--surface`, `sec-head` and `btn` with `btn--primary`, `btn--ghost`, `btn--light` or `btn--translucent`.

## Recipe: add a simple page

1. Choose a candidate URL and check [Astro pages](src/pages), root [Next routes](../app), [middleware](../middleware.ts), [Next configuration](../next.config.ts), [Vercel configuration](../vercel.json) and [Astro configuration](astro.config.mjs) for overlap or redirects. The [generated route catalog](../docs/knowledge-base/generated/routes.md) is a navigation aid; check the current source and deployed precedence separately. A dynamic filename also needs its actual `getStaticPaths` behavior reviewed.
2. Create `src/pages/<name>.astro` only after that scope check. This example uses existing imports and classes; replace the placeholder title and copy with approved content. Relative imports below are for a page directly under `src/pages/`.

```astro
---
import Layout from '../layouts/Layout.astro';
import Icon from '../components/Icon.astro';
---
<Layout title="Page title — WorkforceAP" description="An approved page summary.">
  <section class="band band--surface" aria-labelledby="page-title">
    <div class="wrap">
      <header class="sec-head">
        <h1 id="page-title">Page title</h1>
        <p>Approved information for this page.</p>
      </header>
      <a class="btn btn--primary" href="/programs">
        <Icon name="briefcase" size={20} /> Explore programs
      </a>
    </div>
  </section>
</Layout>
```

3. From `marketing/`, run `npm run build`, then `npm run preview` to inspect the built page. Check mobile layout, keyboard navigation, headings and link destinations. Follow the root checks for any combined routing or application change; the local Astro preview alone cannot prove the production URL or an API journey.

## Interactivity and APIs

Static HTML is the default. Use small React islands only when interaction needs them; [career-quiz.astro](src/pages/career-quiz.astro) uses `client:visible`. Existing pages also use ordinary browser scripts: [contact](src/pages/contact.astro), [partner signup](src/pages/partners.astro) and [careers](src/pages/careers.astro) call root Next API routes. These are not uniformly static form mockups.

An Astro-only dev/preview server does not provide those Next APIs. Test an interactive journey on an explicitly configured combined target, preserving validation, captcha and consent contracts. Public configuration needed by static pages is selected at build time; inspect the relevant page before changing environment names. Keep server secrets out of frontmatter values that render into HTML and out of browser scripts.

## Internationalization

Translations live in [src/i18n](src/i18n): `en.json`, `es.json`, `fr.json`, `pt.json`. Use `useT(lang)` from [t.ts](src/i18n/t.ts); missing translations fall back to English, then the key. [Home.astro](src/components/Home.astro) and [the localized home route](src/pages/%5Blang%5D/index.astro) show the current pattern. Setting the layout's `lang` prop does not translate arbitrary text. Astro locale configuration and root middleware rewriting both affect URLs; do not assume every page has generated translations.

## Commands

Run these inside `marketing/`; its package and lockfile are separate from the root pnpm package.

- `npm ci` — install the locked marketing dependencies.
- `npm run dev` — Astro development server, normally port 4321.
- `npm run build` — compile static output into `dist/`.
- `npm run preview` — serve that built output locally.
