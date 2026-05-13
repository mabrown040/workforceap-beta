# Incident Response Plan

**Project:** WorkforceAP  
**Last Updated:** 2026-05-13  
**Audience:** Engineers, DevOps, leadership, security reviewers  
**Purpose:** Define roles, procedures, and runbooks for handling security incidents and production outages.

---

## Severity Levels

| Level | Name | Criteria | Response Time | Examples |
|-------|------|----------|---------------|----------|
| **SEV1** | Critical | Active data breach, production completely down, active exploit in progress, PII exposure | 15 min | RCE exploited; DB exposed; unauthorized admin access |
| **SEV2** | High | Partial outage, potential data exposure, significant feature broken | 1 hour | Rate limiting bypassed; RLS policy gap found; major API abuse |
| **SEV3** | Medium | Single feature broken, no data risk, degradation of non-critical service | 4 hours | Email delivery failing; cron job stuck; minor UI bug |
| **SEV4** | Low | Cosmetic issue, monitoring noise, documentation fix | 24 hours | Sentry false positive; typo in error message |

---

## Response Team

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| Incident Commander | Mike (Founder) | Michael Brown Sr. | michael.brown2@workforceap.org |
| Technical Lead | TBD | TBD | — |
| Communications | TBD | TBD | — |
| Legal / Compliance | TBD | TBD | — |

**External contacts:**
- Supabase support: https://supabase.com/dashboard/support
- Vercel support: https://vercel.com/help
- Sentry support: https://sentry.io/contact/support/
- Cloudflare support: https://support.cloudflare.com

---

## Response Lifecycle

### 1. Detect
- Sentry alerts (`@sentry/nextjs`)
- Health endpoint monitoring (`/api/health`)
- Vercel alerting (build failures, edge errors)
- Manual reports (members, staff, partners)
- Automated security scanning (future: Snyk, Dependabot)

### 2. Triage
- Classify severity using table above
- Confirm incident is real (not false positive)
- Create incident channel / thread
- Notify Incident Commander if SEV1 or SEV2

### 3. Contain
**SEV1:**
- Immediately freeze affected resources
- Rotate any potentially compromised secrets
- Force password resets for affected accounts
- Disable compromised features / routes
- Capture logs and snapshots before they rotate

**SEV2:**
- Apply rate limits or IP blocks
- Temporarily disable affected feature flag
- Rotate suspected secrets

**SEV3/SEV4:**
- Schedule fix during next deployment window
- No immediate containment needed

### 4. Eradicate
- Deploy fix to staging first
- Verify fix with targeted tests
- Deploy to production
- Monitor for 30 min post-deploy

### 5. Recover
- Verify all services healthy (`/api/health`, Sentry error rate)
- Confirm affected members/staff can access platform
- Restore any disabled features
- Communicate resolution to stakeholders

### 6. Post-Mortem
- **SEV1/SEV2:** Within 48 hours
- **SEV3:** Within 1 week
- Document: timeline, root cause, impact, what worked, what didn't
- Create actionable follow-ups with owners and due dates
- Share internally; SEV1 may require external disclosure

---

## Communication Templates

### Internal Alert (Slack / Email)

```
[SEV1] WorkforceAP Security Incident
- Detected: <timestamp>
- Summary: <one sentence>
- Impact: <who is affected>
- Actions taken: <containment steps>
- Next update: <time>
- Incident commander: <name>
```

### Member-Facing Notification (if data breach)

```
Subject: Important Security Notice — WorkforceAP

We are writing to let you know that on <date> we became aware of a security
incident that may have affected your account. We take your privacy seriously
and are taking immediate steps to resolve it.

What happened:
<brief, honest description>

What information was involved:
<specific fields, e.g., name, email, phone>

What we are doing:
- We have fixed the vulnerability
- We have rotated all affected credentials
- We are reviewing our security practices

What you should do:
- Reset your WorkforceAP password
- Enable MFA if you have not already
- Watch for suspicious emails claiming to be from us

If you have questions, contact info@workforceap.org.
```

### Partner / Employer Notification

```
Subject: WorkforceAP Platform Incident — <date>

We experienced a <SEV level> incident on <date> that <brief impact>.

Status: <resolved / ongoing>
Impact: <affected systems or data>
Actions taken: <containment and fix>
Next steps: <follow-ups>

Your data: <confirmation of whether partner data was affected>
```

---

## Runbooks

### Runbook: Suspected Data Breach

1. **Immediate (0–15 min):**
   - Confirm breach scope (tables, users, time window)
   - Run: `SELECT * FROM audit_logs WHERE created_at > '<time>' ORDER BY created_at DESC;`
   - Export audit logs to secure storage
   - Disable write access to affected tables if needed (Supabase Dashboard → Database → Policies)

2. **Containment (15–60 min):**
   - Rotate all secrets (see Secret Rotation Runbook)
   - Force password reset for affected user accounts
   - Revoke all active sessions (`supabase.auth.admin.signOut`)
   - Enable emergency rate limiting

3. **Investigation (1–4 hours):**
   - Review Sentry errors around incident time
   - Check Vercel logs for suspicious requests
   - Review Supabase Auth logs for anomalous logins
   - Document timeline

4. **Notification:**
   - SEV1: Notify legal counsel within 24 hours (state breach laws)
   - Notify affected members within 72 hours
   - File required regulatory notices

5. **Recovery:**
   - Re-enable services after fix verified
   - Monitor for 48 hours

---

### Runbook: DDoS / API Abuse

1. **Detect:**
   - Vercel analytics showing spike in requests
   - Rate limit alerts firing
   - Sentry `429` error spike

2. **Contain:**
   - Enable Cloudflare "Under Attack" mode (if using Cloudflare proxy)
   - Vercel: temporarily enable Attack Challenge Mode
   - Add emergency IP blocks via middleware or Vercel firewall
   - Scale Upstash Redis if rate-limit store is saturated

3. **Eradicate:**
   - Identify attack pattern (user-agent, path, source ASN)
   - Add WAF rules or middleware blocks
   - Consider geographic blocks if attack is region-specific

4. **Recover:**
   - Monitor traffic for 1 hour post-mitigation
   - Remove temporary blocks when safe

---

### Runbook: Credential Leak

1. **Detect:**
   - Secret found in public repo, Sentry event, or logs
   - Automated scanner alert (GitHub secret scanning, Snyk)

2. **Contain:**
   - Immediately rotate leaked secret
   - Check audit logs for any usage of leaked credential
   - Force password reset if user credential leaked
   - Revoke all sessions tied to leaked credential

3. **Investigate:**
   - Determine exposure window (when was secret committed / logged?)
   - Review any API calls made with leaked credential
   - Check for secondary compromise (did attacker pivot?)

4. **Rotate checklist:**
   | Secret | How to rotate |
   |--------|---------------|
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → Regenerate service role key |
   | `CRON_SECRET` | `openssl rand -hex 32` → update Vercel env → redeploy |
   | `AUTH_TRUST_COOKIE_SECRET` | Regenerate → update Vercel → redeploy (invalidates all MFA trust cookies) |
   | `RESEND_API_KEY` | Resend Dashboard → API Keys → Rotate |
   | `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Roll key |
   | `COURSERA_API_TOKEN` | Coursera Admin → API Keys → Rotate |

---

### Runbook: Production Outage

1. **Detect:**
   - Health endpoint failing (`/api/health`)
   - Vercel deployment error
   - Sentry error spike
   - Member reports

2. **Triage:**
   - Check Vercel status page: https://vercel-status.com
   - Check Supabase status page: https://status.supabase.com
   - Check last deployment time and diff
   - Check if outage is global or region-specific

3. **Rollback (if deployment caused):**
   - Vercel Dashboard → Production Deployment → … → Promote previous deployment
   - Or: `vercel --prod` from last known good commit
   - Verify rollback resolves issue

4. **If not deployment-related:**
   - Check Supabase DB connection limits
   - Check Redis (Upstash) connectivity
   - Check third-party service status (Resend, Stripe, ElevenLabs)

5. **Communicate:**
   - Post status update to internal channel
   - If >30 min outage, notify partners/employers

---

## Rollback Procedures

### Code Rollback

```bash
# Identify last known good commit
git log --oneline -10

# Rollback via Vercel CLI
vercel --prod

# Or revert in git and redeploy
git revert <bad-commit>
git push origin main
```

### Database Rollback

**Warning:** Only use for schema migrations, NOT for data recovery.

```bash
# Using Supabase CLI
supabase db reset --linked

# Or restore from backup (contact Supabase support for point-in-time recovery)
```

### Secret Rollback

Secrets do NOT have "rollback" — always generate fresh values. Never reuse old secrets.

---

## Escalation Paths

```
SEV3/SEV4: Engineer on call → Fix → Document
SEV2:      Engineer → Incident Commander (Mike) → Fix → Post-mortem
SEV1:      Engineer → Incident Commander + Legal → Contain → Fix → Disclosure → Post-mortem
```

**When to call legal:**
- Any confirmed PII breach
- Regulatory reporting threshold met (varies by state; Texas: >250 residents)
- Law enforcement inquiry
- Ransomware or extortion demand

---

## Tools & Access

| Tool | URL | Purpose |
|------|-----|---------|
| Vercel Dashboard | https://vercel.com | Deployments, env vars, logs |
| Supabase Dashboard | https://supabase.com/dashboard | DB, Auth, Storage, RLS |
| Sentry | https://sentry.io | Error tracking, alerts |
| Upstash | https://console.upstash.com | Redis, rate limits |
| Cloudflare | https://dash.cloudflare.com | DNS, WAF, Turnstile |
| Resend | https://resend.com | Email delivery |
| Stripe | https://dashboard.stripe.com | Payments |

---

## Review Schedule

- **Quarterly:** Review and update contact info, runbooks, tools access
- **Annually:** Tabletop exercise (simulate SEV1 breach)
- **Post-incident:** Update this document with lessons learned

---

*Document history:*
| Date | Change |
|------|--------|
| 2026-05-13 | Initial incident response plan — created to address SEC-BLOCK-006 |
