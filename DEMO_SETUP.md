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

## Step 5: Run migrations on demo DB

```bash
# Set env vars locally pointing to demo Supabase
export POSTGRES_URL_NON_POOLING="postgresql://..."  # demo project direct URL

npm run db:migrate:deploy
```

---

## Step 6: Seed demo data

```bash
export SEED_DEMO=true
export POSTGRES_PRISMA_URL="..."  # demo project pooler URL
export POSTGRES_URL_NON_POOLING="..."

npm run db:seed:demo
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
- Jordan Williams — enrolled in IBM AI Developer Certificate
- 3 of 10 courses completed, 84% assessment score
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

```bash
# Wipe and re-seed anytime:
npx prisma migrate reset --skip-seed  # wipes DB
SEED_DEMO=true npm run db:seed:demo    # re-seeds
```
