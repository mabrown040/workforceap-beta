# WorkforceAP — security & compliance hardening backlog (2026-03-21)

Repo-first notes for a **controlled audit**: validate patterns in code, then live flows, then fix prompts.  
This is **not** a certification of security or PII compliance.

## Green-ish (patterns observed)

| Area | Notes |
|------|--------|
| Middleware | Protects `/dashboard`, `/resources`, `/help`, `/applications`, `/certifications`, `/profile`, `/account`, `/partner`, `/employer`, `/my-group`, `/admin` — first gate only. |
| Rate limiting | `lib/rate-limit.ts` — signup/contact/apply fail closed without Redis; **auth + AI tools + employer import** fail open without Redis (dev usability); production should set `UPSTASH_*`. |
| Some admin APIs | Example: `app/api/admin/invites/route.ts` — `getUser`, `isAdmin`, rate limit, then send email. |
| Subgroup route shape | `app/api/subgroup/members/[id]/route.ts` — user + subgroup membership checks before detail. |
| Resume delivery | `app/api/member/resume/route.ts` — signed URLs pattern; **must** pair with bucket policy + path ownership review. |

## Yellow (needs deeper validation)

| Area | Risk |
|------|------|
| API authz completeness | Middleware ≠ per-handler checks on every admin / employer / partner / member data API. |
| Role model | `lib/auth/roles.ts` — profile vs other role sources; UI vs API mismatch; super-admin / subgroup edge cases. |
| Email surface | `lib/email.ts` — many transactional paths; verify recipients, PII in bodies, from/reply consistency. |
| Rate limit coverage | Confirm which routes call which limiter consistently. |
| PII in responses | Admin/member detail + notes endpoints — field-level review. |

## Red / prioritize

1. **Employer bulk import** — `app/api/employer/jobs/import-bulk/route.ts` — authz, abuse, cost (AI/network), payload limits, observability.  
   - *Progress (2026-03-21):* Shared per-user Upstash limiter **8 POSTs/hour** across `import-bulk` + `import` (`checkEmployerJobImportRateLimit`); bulk `careersPageRawText` capped at **200k** chars; single `rawText` capped at **60k**. Still review: sub-request fan-out, logging, non-Redis env behavior.  
2. **All email templates + destinations** — who gets what, data minimization.  
3. **Auth flows** — login, invite, reset, session cookies.  
4. **Storage** — resume paths, object ownership, no cross-user reads.  
5. **Admin/member detail APIs** — authorization on every field and side effect.

## Suggested test matrix (live)

- Unauthenticated access to protected API paths (expect 401/403).  
- Cross-role: member JWT vs employer/partner/admin routes.  
- Subgroup user A cannot read member B outside org.  
- Employer cannot import or mutate another employer’s jobs.  
- Resume URL cannot be replayed for another user’s object key.

## Local repo sync reminder

Before auditing, confirm local `master` matches `origin/master` (avoid reviewing stale SHAs).

---

## UX fix shipped same sprint (sign-in / nav)

- **Public nav:** single **Sign in** link to `/login` (no triple portal chips).  
- **Login page:** explicit **Member / Partner / Employer** destination cards with `?redirectTo=` (plus open-redirect guard for relative paths only).
