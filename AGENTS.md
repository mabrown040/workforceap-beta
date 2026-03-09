# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 15 (App Router)** website — a replica of the live Squarespace-hosted site at [workforceap.org](https://workforceap.org), intended for self-hosting without Squarespace. The live Squarespace site is the visual reference for how pages should look.

### Running the dev server

```bash
npm run dev
```

Or for production build + serve:

```bash
npm run build && npm start
```

Open `http://localhost:3000` in a browser.

### Project structure

- `app/` — Next.js App Router pages (10 routes)
  - `layout.tsx` — root layout with TopBanner, MainNav, ScrollAnimations, and global CSS
  - `page.tsx` — homepage
  - `apply/`, `programs/`, `what-we-do/`, `how-it-works/`, `faq/`, `contact/`, `leadership/`, `salary-guide/`, `program-comparison/` — inner pages
- `components/` — shared React components (TopBanner, MainNav, Footer, PageHero, PhotoHighlight, ScrollAnimations)
- `css/main.css` — all styles (imported globally via layout.tsx)
- `public/images/` — static image assets
- `next.config.ts` — Next.js configuration including redirects for old `.html` URLs
- `Caddyfile` — production reverse-proxy config
- `DEPLOY.md` — production deployment instructions

### Lint / Test / Build

```bash
npm run build    # TypeScript type-checking + Next.js production build
```

There are no configured linters or test frameworks. For validation, run `npm run build` which will catch TypeScript and compilation errors.
