# WorkforceAP Demo Environment Setup

A fully seeded demo site for investor/partner demos, separate from production.

---

## Architecture

| Layer | Production | Demo |
|-------|-----------|------|
| URL | workforceap.org | demo.workforceap.org |
| GitHub branch | `master` | `demo` |
| Supabase project | Production project | Separate "demo" project |
| Vercel | Production deployment | Preview deployment from `demo` branch |

---

## Step 1: Create a new Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project** → name it `workforceap-demo`
3. Save the credentials (you'll need them in Step 3)
4. Under **Project Settings → Database**, copy:
   - `POSTGRES_PRISMA_URL` (port 6543, pgbouncer=true)
   - `POSTGRES_URL_NON_POOLING` (port 5432)
5. Under **Project Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Create the `demo` branch

```bash
git checkout master
git checkout -b demo
git push origin demo
```

---

## Step 3: Add Vercel deployment for demo branch

1. In Vercel dashboard → workforceap-beta project → **Settings → Git**
2. Under **Preview Branches**, ensure `demo` branch deploys automatically
3. Go to **Settings → Domains** → add `demo.workforceap.org` pointing to the demo branch deployment

---

## Step 4: Set Vercel environment variables for demo

In Vercel → Project Settings → Environment Variables, for the **Preview** environment (scoped to `demo` branch):

```
NEXT_PUBLIC_SUPABASE_URL=     (demo Supabase URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY= (demo anon key)
SUPABASE_SERVICE_ROLE_KEY=    (demo service role key)
POSTGRES_PRISMA_URL=          (demo pooler URL)
POSTGRES_URL_NON_POOLING=     (demo direct URL)
RESEND_API_KEY=               (same as prod, or demo-specific)
NEXT_PUBLIC_SITE_URL=         https://demo.workforceap.org
CRON_SECRET=                  (generate a new one: openssl rand -hex 32)
SEED_DEMO=                    true
GROQ_API_KEY=                 (same as prod)
```

---

## Step 5: Create the demo schema

> **`npm run db:migrate:deploy` does not work on a brand-new database.** The
> historical migration history cannot be replayed onto an empty database. A
> disposable-database replay on 2026-09-18 (PostgreSQL 16.13, Prisma 5.22)
> stopped at migration 21 of 178 with `P3018` / `42P07`
> (`relation "partner_users" already exists`), and working past each failure in a
> scratch copy uncovered six further independent blockers before migration ~110 —
> including two truncated migration files that are not valid SQL and one
> migration that depends on a table no migration ever creates. See
> [docs/DATABASE-RECOVERY.md](docs/DATABASE-RECOVERY.md) for the full list. Do not
> try to "push through" these by editing historical migration files; that is
> forbidden by the migration-history rules and fails `npm run check-migrations`.

Use `db:push`, which applies `prisma/schema.prisma` directly:

```bash
# Set env vars locally pointing to demo Supabase
export POSTGRES_PRISMA_URL="postgresql://..."       # demo project pooler URL
export POSTGRES_URL_NON_POOLING="postgresql://..."  # demo project direct URL

npm run db:push
```

**Known limitation — read before using this for anything but a throwaway demo.**
`db:push` reproduces only what `schema.prisma` can express. It does **not** apply
migration-only DDL: the RLS policies from `20260513040000_add_rls_policies`, the
curriculum-immutability triggers, and other SQL-only objects. A demo project
provisioned this way is **not** security-equivalent to production and must not be
loaded with real member data. It is also not a production recovery procedure.

---

## Step 6: Seed demo data

Run the base seed first — `db:seed:demo` expects the default organization, the
roles and the program catalog to already exist, and fails without them:

```bash
export POSTGRES_PRISMA_URL="..."  # demo project pooler URL
export POSTGRES_URL_NON_POOLING="..."

npm run db:seed        # default org `workforceap`, roles, programs, blog, demo jobs
SEED_DEMO=true npm run db:seed:demo
```

---

## Step 7: Create portal login accounts in Supabase

In the **demo** Supabase project → **Authentication → Users → Invite user** (or use the Supabase Auth admin SDK):

| Email | Password | Portal |
|-------|----------|--------|
| demo-member@workforceap.org | Demo2026! | /dashboard |
| demo-employer@workforceap.org | Demo2026! | /employer |
| demo-partner@workforceap.org | Demo2026! | /partner |
| demo-admin@workforceap.org | Demo2026! | /admin |

---

## What the demo shows

### Member Portal (`demo-member@workforceap.org`)
- Jordan Williams — enrolled in the AI and Software Developer Professional Certificate (IBM)
- 3 of 17 courses completed (live `CourseProgress` rows), 84% assessment score
- AI job match pending for Junior ML Engineer role

### Employer Portal (`demo-employer@workforceap.org`)
- Contango IT — Sarah Chen (HR Director)
- 5 realistic job postings (IT Support, Cloud Ops, Data Analyst, Cybersecurity, AI/ML)
- AI match pipeline showing 6 candidate matches with scores and reasons

### Partner Portal (`demo-partner@workforceap.org`)
- Angela Davis — Workforce Solutions Capital Area
- 3 referred members in pipeline (Jordan, Maria, Keisha)
- 1 placed member (Keisha Washington — Dell Technologies)

### Admin Portal (`demo-admin@workforceap.org`)
- Full member roster: 8 members across pipeline stages
- 2 placements (Darnell @ Accenture, Keisha @ Dell)
- Program catalog populated, blog seeded, employer pipeline visible

---

## Resetting demo data

`npx prisma migrate reset` does **not** work here: it drops the database and then
replays the migration history, which fails for the reasons in Step 5. Reset by
recreating the database and repeating Steps 5 and 6:

```bash
# Drop + recreate the database (local example; on Supabase use the dashboard's
# "Reset database" or drop and recreate the public schema), then:
npm run db:push        # recreate schema from schema.prisma
npm run db:seed        # default org, roles, program catalog, blog, demo jobs
SEED_DEMO=true npm run db:seed:demo   # demo members, employer, partner, admin
```
