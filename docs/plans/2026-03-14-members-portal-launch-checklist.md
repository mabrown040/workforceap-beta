# WorkforceAP Members Portal – Launch Checklist

**Date:** 2026-03-14  
**Status:** Pre-launch

## Pre-deployment

### 1. Environment variables (Vercel)

- [ ] `DATABASE_URL` – Supabase Postgres connection string (from Vercel + Supabase integration)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` – Server-only (never expose)
- [ ] `UPSTASH_REDIS_REST_URL` – For rate limiting
- [ ] `UPSTASH_REDIS_REST_TOKEN` – For rate limiting
- [ ] `RESEND_API_KEY` – For transactional email (optional)
- [ ] `EMAIL_FROM` – Sender address (e.g. `noreply@workforceap.org`)

### 2. Database

- [ ] Run migrations: `npm run db:migrate:deploy`
- [ ] Seed roles: `npm run db:seed`
- [ ] Create first admin: `INSERT INTO user_roles (user_id, role_id) SELECT '<user_uuid>', id FROM roles WHERE name = 'admin';`
- [ ] Run RLS policies in Supabase SQL Editor: `supabase/policies.sql`

### 3. Supabase Auth

- [ ] Enable Email provider in Supabase Auth settings
- [ ] Configure email templates (confirm signup, reset password)
- [ ] Set Site URL and Redirect URLs in Auth settings
- [ ] (Optional) Enable magic link if desired

### 4. Security

- [ ] Verify middleware protects `/dashboard`, `/resources`, `/admin`
- [ ] Confirm admin routes require `admin` or `case_manager` role
- [ ] Rate limiting enabled (Upstash) for signup and admin API
- [ ] Security headers applied (next.config.ts)

### 5. Monitoring (optional)

- [ ] Add Sentry: `npm i @sentry/nextjs` and configure
- [ ] Set `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` in Vercel

## Post-deployment

- [ ] Test signup flow end-to-end
- [ ] Test login and redirect to dashboard
- [ ] Test password reset
- [ ] Test admin review flow (approve/deny)
- [ ] Verify protected routes redirect unauthenticated users
- [ ] Run Lighthouse a11y on `/signup`, `/login` (target ≥95)

## Rollback

- [ ] Document rollback steps (revert Vercel deployment, DB restore if needed)
- [ ] Ensure daily backups are configured in Supabase

## Sign-off

- [ ] Security checklist complete
- [ ] E2E tests pass in CI
- [ ] Stakeholder approval
