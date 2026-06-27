# wap-astro — WorkforceAP marketing site (Astro spike)

Standalone Astro port of the WorkforceAP marketing site, for comparing the
Astro stack against the live Next.js app (`feature/marketing-ui-refresh`).

- Design system: `src/styles/blend.css` (the same truth-locked blend used in Next)
- Shared chrome: `src/layouts/Layout.astro` (nav + footer + fonts)
- 20 pages in `src/pages/*.astro` — zero JS shipped by default (static HTML)

## Run
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/ (static)
npm run preview
```

Truth-locked: no fabricated stats/claims/testimonials. Forms are static
representations in this spike (wire as React islands when porting for real).
