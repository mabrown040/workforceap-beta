# WorkforceAP marketing package

This is the active Astro marketing package in the WorkforceAP repository. It produces static pages and selected React islands. The root Next.js application provides dynamic journeys, authentication and API handlers. Start with the [central knowledge base](../docs/knowledge-base/README.md), then the [marketing authoring guide](AGENTS.md).

The [root Vercel build script](../scripts/vercel-build.cjs) validates `VERCEL_ENV`, runs `npm ci` and the Astro build here, copies `dist/` into root `public/`, and runs the selected Next build. See [build routing](../docs/knowledge-base/operations.md#build-routing). Keep Astro's output in `dist/`; do not configure it to clear the root `public/` directory.

Before adding or changing a URL, check [Astro pages](src/pages), root [Next routes](../app), [middleware](../middleware.ts), [Next redirects](../next.config.ts) and [Astro configuration](astro.config.mjs) for overlap. Static filename patterns and generated route counts do not prove which implementation serves a deployed URL or expand every dynamic/locale route.

## Local commands

From this directory:

```bash
npm ci
npm run dev      # normally http://localhost:4321
npm run build    # writes dist/
npm run preview # serves the built Astro output
```

This package has its own `package-lock.json` and React/Astro dependencies; the root application uses pnpm. An Astro-only server does not provide the root Next APIs. Forms such as [contact](src/pages/contact.astro), [partner signup](src/pages/partners.astro) and [careers](src/pages/careers.astro) already call real API routes, while quiz components have their own behavior. Verify interactive journeys on an explicitly configured combined target; a static build is not a delivery or backend acceptance test.

## Source map

- [Layout](src/layouts/Layout.astro): document, navigation, footer, shared styles and metadata.
- [Brand styles](src/styles/blend.css): light theme, CSS tokens and reusable classes.
- [Components](src/components): shared SVG icons, home content, consent/analytics and React quizzes.
- [Pages](src/pages): current Astro route sources; [archived content](src/_archive) is outside that route directory.
- [Translations](src/i18n) and [Astro configuration](astro.config.mjs): locale data and generation settings; inspect root middleware as well.

Preserve approved nonprofit and qualifying-member copy. Do not invent statistics, promises or testimonials. The [authoring guide](AGENTS.md) includes a minimal example using existing source and the validation requirements for page changes.
