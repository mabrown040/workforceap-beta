# White-Label — Architecture & Patterns

**Track:** E (Multi-tenant UI / White-label) of the enterprise-grade program. See `docs/PROGRAM-ENTERPRISE-GRADE.md`.
**Audit:** `docs/WHITE-LABEL-AUDIT-2026-05-08.md`.
**Status (2026-05-08):**
- PR 1 (#1046) — middleware resolves `Organization.customDomain` from the `Host` header and propagates `x-org-id`.
- **PR 2 (this doc)** — email branding helper + 5 high-value templates parameterized.
- PR 3-5 — nav/footer logo, page metadata, PDF logo (not yet started).

---

## The pattern

Every org-aware presentation surface (today: email; later: nav, PDFs, page metadata) reads brand metadata from a single helper:

```ts
import { getOrganizationBranding } from '@/lib/tenant/organizationBranding';

const branding = await getOrganizationBranding(orgId);
// branding: { orgId, name, logoUrl, primaryColor, supportEmail, domain, domainLabel }
```

The helper returns a fully-resolved `OrganizationBranding` bundle:

| Field | Source | Default when null |
|---|---|---|
| `name` | `Organization.name` | `"Workforce Advancement Project"` |
| `logoUrl` | `Organization.logo` -> Supabase public URL | `${domain}/images/wap_logo.png` |
| `primaryColor` | `Organization.primaryColor` (validated `#RRGGBB`) | `#ad2c4d` (`DEFAULT_BRAND_ACCENT`) |
| `supportEmail` | env `SUPPORT_EMAIL` | `info@workforceap.org` (no per-org column yet — see "Open questions") |
| `domain` | `Organization.customDomain` (scheme-prefixed) | env `NEXT_PUBLIC_SITE_URL` |
| `domainLabel` | `URL(domain).host` | derived from default domain |

### Why a helper, not direct `prisma.organization.findUnique`

1. **Caching.** Hot send paths (job approve, weekly digest, batch invite) would hit the DB once per email. The helper memoizes per-orgId for 60s, so a 1000-email blast becomes 1 DB read.
2. **Centralized fallback logic.** A new template author cannot forget to handle a null logo or invalid hex — the helper has done it.
3. **Future-proofing.** When the schema gains explicit `supportEmail` / `senderEmail` columns, only this helper changes; every template stays put.
4. **Failure isolation.** Email is fire-and-forget; the helper degrades to defaults on any DB error so a transient blip cannot wedge an outgoing send.

### Cache invalidation

After admin org-settings writes, call `clearOrganizationBrandingCache(orgId)` so the next email reflects the new logo / color without waiting for the 60s TTL. Tests use `clearOrganizationBrandingCache()` (no arg) to reset between cases.

---

## Email layer wiring

### Sender functions

The 5 email sender functions migrated in PR 2 each take an optional `orgId`:

```ts
await sendJobApprovedEmail({ to, jobTitle, companyName, orgId });
```

When `orgId` is omitted, the sender resolves the default WorkforceAP bundle (legacy behavior preserved). When supplied, the sender:

1. Resolves `branding = await getOrganizationBranding(orgId)`.
2. Passes `branding` to the body builder (`jobApprovedHtml({ ..., branding })`).
3. Passes `branding` to `brandedEmailLayout({ ..., branding })` so the header logo, accent color, footer copy, and CTA href origin all match.
4. Builds the subject line with `branding.name` (e.g. "Welcome to AAUL — Your Application Was Accepted").

### Body builders

Each migrated builder in `emails/*.ts` accepts an optional `branding: OrganizationBranding`. When supplied:

- `branding.name` replaces the hardcoded `"WorkforceAP"` in copy.
- `branding.supportEmail` replaces hardcoded `info@workforceap.org` mailto: links.
- `branding.primaryColor` is used for inline link/button accent colors that the layout cannot reach (e.g. body links).

When omitted, builders fall back to the original WorkforceAP wording so the ~25 templates not yet migrated continue to work unchanged.

### `brandedEmailLayout`

`lib/email/template.ts` accepts an optional `branding` and uses it for:
- Header `<img src>` (logo) + alt text (org name)
- Header link (anchor wrapping logo) -> `branding.domain`
- CTA button background (`branding.primaryColor`)
- CTA href same-origin enforcement (validates against `branding.domain`)
- Footer org name, footer link text (`branding.domainLabel`)
- Footer link href (`branding.domain`)
- Footer link color (`branding.primaryColor`)

The legacy WorkforceAP-hardcoded layout is preserved when no branding is passed.

---

## What's parameterized vs not (PR 2)

### Migrated (5 templates)

| Sender fn | Body file | Callers updated |
|---|---|---|
| `sendApplicationAcceptedEmail` | `emails/application-accepted.ts` | (no in-tree caller currently — fallback path verified) |
| `sendJobApprovedEmail` | `emails/job-approved.ts` | `app/api/admin/jobs/[id]/approve/route.ts` |
| `sendJobRejectedEmail` | `emails/job-rejected.ts` | `app/api/admin/jobs/[id]/reject/route.ts` |
| `sendInvitationEmail` | `emails/invitation.ts` | `app/api/admin/invites/route.ts`, `.../[id]/resend/route.ts` |
| `sendCounselorAssignedEmail` | `emails/counselor-assigned.ts` | `app/api/admin/members/[id]/counselor/route.ts` |

Plus `sendPasswordResetEmail` in `lib/auth/passwordReset.ts` accepts `options.orgId`; admin-side reset flows pass it (the unauthenticated `/api/auth/forgot-password` cannot, since looking up org by email would leak whether the email is registered). See "Open questions".

### Not migrated (PR 2 explicitly defers)

The other ~30 sender functions in `lib/email.ts` (voice coach transcripts, weekly recaps, AI match suggestions, partner digest, course completed, etc.) still hardcode WorkforceAP. They keep working because `brandedEmailLayout` and the body builders preserve their old defaults when `branding` is omitted.

Subsequent PRs will migrate them in batches grouped by audience:
- PR 3 — member-facing emails (course-enrolled, course-completed, weekly-recap, inactive-nudge, application-confirmation)
- PR 4 — admin/staff emails (admin-pending-applicants, admin-weekly-recap, voice coach transcripts, pre-screening-ready)
- PR 5 — partner / employer emails (partner-weekly-digest, partner-referral-invite, ai-match-suggestion, new-job-application)

### Out of scope (parked)

- **Resend "from" header.** `getFrom()` in `lib/email.ts` still hardcodes `'WorkforceAP <hello@workforceap.org>'`. White-labeling this requires per-org verified sending domains in Resend (ops + DNS work), not just code. Track separately.
- **Supabase auth-emailed templates.** `sendPasswordResetEmail` only controls the redirect URL — Supabase Auth owns the email body and "from" header. White-labeling those bodies requires either configuring custom email templates in the Supabase dashboard (with `{{ .SiteURL }}` interpolation) or replacing the Supabase send entirely with our own Resend send. Out of scope here.
- **PDF exports + nav/footer logos.** Tracked as PR 3-5.

---

## Tests

| File | Coverage |
|---|---|
| `lib/tenant/organizationBranding.test.ts` | Defaults, override, custom domain (with + without scheme), invalid hex rejection, name fallback, 60s TTL cache hit, per-orgId invalidation, missing-row caching, fetcher-throws fallback. |
| `emails/branding-parameterization.test.ts` | Each migrated body builder uses branding fields and does NOT emit hardcoded WorkforceAP strings; default fallback path still works; `brandedEmailLayout` with + without branding. |

---

## Open questions for reviewer

1. **Schema field gap.** The brief mentioned `Organization.supportEmail` and `Organization.senderEmail`, but `prisma/schema.prisma` (verified 2026-05-08) only has `name`, `slug`, `customDomain`, `logo`, `primaryColor`, `billingType`, `plan`, `active`, `overviewVideoUrl`. The branding helper uses `process.env.SUPPORT_EMAIL` (default `info@workforceap.org`) so AAUL members today see the WorkforceAP support email regardless of branding. **Should we add a per-org `supportEmail` column in PR 3, or keep the env-driven model until a customer asks?**
2. **Forgot-password org context.** `/api/auth/forgot-password` is unauthenticated; we cannot look up org by email without leaking account existence. After PR 1 (custom domain in middleware), the natural source is the `x-org-id` header on the request. **Do we want to thread that into the route in this PR, or wait until middleware-resolved org-id is consumed in more places?**
3. **Subject-line "from" mismatch.** The subject says "Welcome to AAUL" but the Resend "from" header says `WorkforceAP <hello@workforceap.org>`. This is jarring. **Is per-org sending domain on the Sprint E roadmap, or do we accept the dissonance until a customer specifically requests their own domain?**
4. **`getFrom()` parameterization.** Same root cause as (3). We could add `branding.fromAddress` to the helper today (env-driven default, schema column later). Worth doing in PR 3?
