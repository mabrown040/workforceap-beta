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

### Local PostgreSQL requirement

The `npm run build` script runs Prisma migrations, generates the client, and seeds the database before building. A running PostgreSQL instance is required. The update script handles starting PostgreSQL and running migrations automatically.

If PostgreSQL is not yet installed, install it via `sudo apt-get install -y postgresql postgresql-client`, start with `sudo pg_ctlcluster 16 main start`, and create the dev database:

```bash
sudo -u postgres psql -c "CREATE USER workforceap WITH PASSWORD 'devpassword' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE workforceap OWNER workforceap;"
```

The `.env` file should contain:
```
DATABASE_URL=postgresql://workforceap:devpassword@localhost:5432/workforceap
POSTGRES_PRISMA_URL=postgresql://workforceap:devpassword@localhost:5432/workforceap
POSTGRES_URL_NON_POOLING=postgresql://workforceap:devpassword@localhost:5432/workforceap
```

### Members portal (optional external services)

Public marketing pages (/, /apply, /programs, etc.) work without any external services. The members portal (/dashboard, /admin, /ai-tools, etc.) requires Supabase Auth credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Without them, the middleware gracefully redirects protected routes to `/login`. Groq, Upstash Redis, and Resend are optional and degrade gracefully.
