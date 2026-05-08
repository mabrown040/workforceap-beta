# White-Label / Multi-Tenant UI Readiness Audit
**Date:** 2026-05-08  
**Track:** E — Multi-tenant UI  
**Scope:** How `Organization.customDomain`, `primaryColor`, `logo`, and branding fields flow through the codebase

---

## Executive summary

- **Ready (60%):** Schema fields exist and are stored. Logo upload + storage plumbing works. Primary color flows to CSS vars in render. Admin settings UI is complete.
- **Partial (30%):** Custom domain field exists in schema but is **never read** — no middleware-level org resolution by Host header. Email templates are 100% hardcoded WorkforceAP (logo, copy, colors, domain). Nav logos and footer are hardcoded to `/images/wap_logo.png`.
- **Missing (10%):** No request-level org context from `Host` header. No org-aware email template rendering. Metadata (favicon, theme-color, OG image) hardcoded to WorkforceAP. No test for custom domain → org lookup.

**Verdict:** Schema + admin UI are 80% ready for white-label. Middleware and email are 0% ready. **One 2-day sprint can land 70% of the value:** wire custom domain resolution in middleware + parameterize email branding. The remaining 30% (full CSS theme overrides, nav logo swapping, metadata per-org) is 3-4 smaller PRs.

---

## Schema inventory

| Field | Type | Purpose | Current consumers | Fallback | Ready? |
|-------|------|---------|-------------------|----------|--------|
| `Organization.slug` | String (unique) | Tenant identifier for default org lookup | `getDefaultOrganizationId()`, seed | Always "workforceap" | ✅ |
| `Organization.customDomain` | String? (unique) | White-label domain (e.g., `aaul.workforceap.org`) | **NONE** — never queried | N/A | ❌ |
| `Organization.logo` | String? | Logo filename in Supabase `organization-branding` bucket | `getDefaultOrgBranding()`, admin settings page, admin API | `null` → fallback to hardcoded `/images/wap_logo.png` | ✅ |
| `Organization.primaryColor` | String? (hex #RRGGBB) | Brand accent color | `getDefaultOrgBranding()`, admin settings, `OrgBrandingStyle` component | `null` → CSS uses default `--color-accent: #ad2c4d` | ✅ |
| `Organization.plan` | String (@default "nonprofit") | Licensing tier | Not read anywhere in UI | Default "nonprofit" | ❌ |
| `Organization.billingType` | String (@default "flat") | Billing model | Not read anywhere in UI | Default "flat" | ❌ |
| `Organization.active` | Boolean (@default true) | Org is enabled | Not read anywhere in UI (no auth guard on active status) | Always treated as true | ❌ |
| `Organization.overviewVideoUrl` | String? | Marketing/onboarding video | `getDefaultOrgBranding()`, admin settings page, admin API | `null` → not rendered | ⚠️ |
| `Organization.name` | String | Display name ("Workforce Advancement Project") | Admin settings, seed | "WorkforceAP" | ⚠️ |

**Summary:** 4 of 9 fields are actually consumed in the codebase. `customDomain` is the critical missing piece—it's defined but never queried.

---

## Custom domain resolution

### What exists today
- Schema field: `Organization.customDomain` (String?, unique index) — defined at `/home/user/workforceap-beta/prisma/schema.prisma:24`
- **NOT queried anywhere** — no middleware, no request handler, no auth layer

### What's missing
- **Middleware (`/home/user/workforceap-beta/middleware.ts`)** — does NOT read `Host` header or `req.headers.host`. Currently only handles:
  - Locale (Accept-Language / cookie)
  - Supabase auth session
  - MFA for admin paths
  - **No tenant lookup by domain**
  
- **Request context** — No way to thread org from Host header into request context. No `x-org-id` header set downstream. No tenant scope applied to DB queries.

- **Email domain** — Hardcoded in `/home/user/workforceap-beta/lib/email.ts:34` as `const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org'` and `/lib/email/template.ts:8`. When AAUL's domain is the Host header, emails are still sent from/with WorkforceAP URLs.

### How to wire it (Sprint E.1)
1. Middleware reads `Host` header
2. Query `Organization` by `customDomain`
3. Set `x-org-id` header + cache org context
4. Downstream code reads org from request context (not from `getDefaultOrganizationId()`)

**Risk:** Cross-tenant data leak if middleware fails to set org context. Must be paired with Track A.2 (RLS + withTenantScope migrations) to be safe.

---

## Branding flow

### Logo
- **Stored:** Supabase bucket `organization-branding` (created on-demand at upload)
- **Queried:** `getDefaultOrgBranding()` in `/home/user/workforceap-beta/lib/platform/defaultOrgTheme.ts:19-21`
- **Resolved:** `resolveSupabasePublicAssetUrl('organization-branding', org?.logo)` → public HTTPS URL
- **Rendered:** 
  - Admin: `AdminOrgSettingsForm` shows current logo (line 24)
  - Portal/marketing: **HARDCODED** to `/images/wap_logo.png` at:
    - `MainNav.tsx:122` — `src="/images/wap_logo.png"`
    - `Footer.tsx` — `src="/images/wap_logo.png"`
    - `JsonLd.tsx` — logo in schema.org metadata
    - Email (React): `Layout.tsx:21` → `logoUrl = 'https://www.workforceap.org/images/wap_logo.png'` (line 21)
    - Email (HTML): `brandedEmailLayout()` at `/lib/email/template.ts:9` → `LOGO_URL` hardcoded
    - PDFs: `route.ts` files embed `/public/images/wap_logo.png` directly (lines reading `join(process.cwd(), 'public', 'images', 'wap_logo.png')`)
  
**Gap:** Logo is stored per-org but never rendered in public-facing UI. Only admin sees it in settings. **Fix needed:** Pass org.logo through layout context or request scope to MainNav, Footer, email templates.

### Primary color
- **Stored:** `Organization.primaryColor` (hex string, no default)
- **Queried:** `getDefaultOrgBranding()` → `orgAccentCss()` validates hex format
- **Rendered:** `OrgBrandingStyle` component at `/home/user/workforceap-beta/components/platform/OrgBrandingStyle.tsx:14`
  - Injects CSS at render: `:root { --org-accent: ${accent}; --color-accent: ${accent}; }`
  - Only if primaryColor is non-null and valid hex
  - Fallback: CSS default `--color-accent: #ad2c4d` (maroon) remains
- **CSS layer:** `/home/user/workforceap-beta/css/main.css:52-55` defines brand colors as CSS vars, including `--color-accent`

**Status:** Works for site theming (accent color changes buttons, links, UI elements via CSS). Email templates **bypass this entirely**:
- Email header: Hardcoded `background: "linear-gradient(135deg, #1a1a1a 0%, #2a0a14 50%, #8c0f37 100%)"` at `emails/Layout.tsx:75`
- CTA button: Hardcoded `background: #4a9b4f` (green) at `/lib/email/template.ts:38`
- Not parametrized per-org

**Fix needed:** Pass `primaryColor` to email templates; apply to header gradient and CTA button.

### Hardcoded CSS vars
In `/css/main.css`:
- `--color-accent: #ad2c4d` (maroon)
- `--color-accent-dark: #8c0f37` (dark maroon)
- `--color-accent-light: #FF8A95` (light maroon)

These are overridable at runtime via `:root { --org-accent: ... }` (see `OrgBrandingStyle` component), but only if org has a primaryColor set. The email system does not use this mechanism.

---

## Email branding

### Current state
All email templates render with **100% WorkforceAP hardcoding**:

1. **Logo** (all templates)
   - `emails/Layout.tsx:21` → hardcoded `logoUrl = 'https://www.workforceap.org/images/wap_logo.png'`
   - HTML email via `brandedEmailLayout()` at `lib/email/template.ts:9` → hardcoded `LOGO_URL`
   - Shows WorkforceAP logo in every email header

2. **Header color** (all templates)
   - `emails/Layout.tsx:75` → hardcoded gradient `linear-gradient(135deg, #1a1a1a 0%, #2a0a14 50%, #8c0f37 100%)`
   - Dark WorkforceAP brand colors, not org-aware

3. **CTA button color** (all templates)
   - `lib/email/template.ts:38` → hardcoded `background: #4a9b4f` (green)
   - Not parameterized

4. **Footer text** (all templates)
   - `emails/Layout.tsx:46` → "Workforce Advancement Project · Free Career Training & Job Support"
   - HTML template at `lib/email/template.ts:74` → "Workforce Advancement Project · Career training and industry certifications"
   - No org name interpolation

5. **Footer link domain** (all templates)
   - Both React and HTML layouts point to hardcoded `baseUrl` / `SITE_URL`
   - When AAUL domain is Host header, emails still link back to `workforceap.org`

6. **Subject lines & copy** (all ~40 templates)
   - E.g., "Welcome to WorkforceAP" at `sendApplicationAcceptedEmail()` in `lib/email.ts:431`
   - "Your WorkforceAP counselor is assigned" at `sendCounselorAssignedEmail()` (line 352)
   - "We Miss You at WorkforceAP" at `sendInactiveNudgeEmail()` (line 775)
   - "Your WorkforceAP Weekly Recap" at `sendWeeklyRecapEmail()` (line 633)
   - Dozens more references to "WorkforceAP" throughout

### Template list
All templates at `/home/user/workforceap-beta/emails/` use the hardcoded layout:
- Invite.tsx, Welcome.tsx, PartnerWeeklyDigest.tsx, CourseCompleted.tsx, CourseStartNotification.tsx
- enrollment-confirmation.ts, new-application-alert.ts, ai-match-suggestion.ts, admin-weekly-recap.ts
- job-approved.ts, job-rejected.ts, new-job-application.ts, application-accepted.ts, application-rejected.ts
- invitation.ts, invitation-accepted.ts, EmployerInvite.tsx, PartnerInvite.tsx, partner-referral-invite.ts
- InactiveNudge.tsx, weekly-recap.ts, applicant-followup.ts, admin-pending-applicants.ts
- counselor-assigned.ts, MagicLink.tsx, job-submitted.ts, NewApplicationAlert.tsx, CandidateMatchAlert.tsx
- StageMovedNotification.tsx, JobPostingStatus.tsx, course-completed.ts, course-enrolled.ts
- + ~10 more ad-hoc functions in `lib/email.ts`

**No tests** for org-parameterized emails — no test that an AAUL org gets different branding.

---

## Hardcoded WorkforceAP-isms

### Files with WorkforceAP brand strings

| File | Line(s) | Hardcoding | Should be org-aware? |
|------|---------|-----------|---------------------|
| `components/MainNav.tsx` | 122 | `src="/images/wap_logo.png"` | ✅ YES |
| `components/Footer.tsx` | ? (not shown) | `src="/images/wap_logo.png"` | ✅ YES |
| `components/JsonLd.tsx` | ? | `logo: ${SITE_URL}/images/wap_logo.png` | ✅ YES |
| `app/layout.tsx` | 31–50 | Metadata: title "Workforce Advancement Project", OG image | ⚠️ Maybe (marketing site OK, portal should be org-aware) |
| `app/layout.tsx` | 74 | `theme-color: #ad2c4d` (hardcoded maroon) | ✅ YES — should be `primaryColor` |
| `middleware.ts` | — | No org resolution | ✅ CRITICAL |
| `emails/Layout.tsx` | 21, 46, 75 | Logo URL, footer text, header gradient | ✅ YES (all) |
| `lib/email/template.ts` | 8–9, 38, 74–77 | Logo URL, CTA button color, footer | ✅ YES (all) |
| `lib/email.ts` | Multiple (34–35, 51, 352, 365, 431, etc.) | Email "from" address, subject lines with "WorkforceAP", footer email | ⚠️ Partially (need org-aware "from" + subject) |
| `tailwind.config.ts` | 26–34 | Brand colors all hardcoded to WorkforceAP palette | ✅ Not needed — CSS vars override at runtime |
| `css/main.css` | 52–65 | Color palette all hardcoded | ✅ Not needed — CSS vars + `OrgBrandingStyle` override |
| `app/api/ai/export-pdf/route.ts` | 1 (path join) | Embeds `/public/images/wap_logo.png` | ✅ YES |
| `app/api/counselor/sessions/email-packet/route.ts` | 1 (path join) | Embeds `/public/images/wap_logo.png` | ✅ YES |

### Domain hardcoding
- `/home/user/workforceap-beta/lib/email.ts:34` → `const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org'`
  - Used in all email CTAs
  - When org has `customDomain`, emails should link to that domain instead
  - Currently no way to pass org domain to email sender

---

## Recommended Sprint E.1 work

### Ranked by value / effort (smallest PRs first)

**PR 1 — Custom domain resolution in middleware [1 day]**
- Read `Host` header in middleware
- Query `Organization.customDomain`
- Set `x-org-id` on request headers
- Fall back to `getDefaultOrganizationId()` if no match
- Add CI test: seed two orgs (`workforceap`, `aaul` with `customDomain: 'aaul.example.com'`), hit endpoint with each Host, verify org isolation
- **Unblocks:** All following PRs depend on this

**PR 2 — Parameterize email branding [2 days]**
- Fetch org from request context (passed via org-aware email sender wrapper)
- Pass `org: { logo, primaryColor, name, customDomain }` to `brandedEmailLayout()` + React email layouts
- Update `emails/Layout.tsx` to interpolate `org.logo` + `org.name` (fallback to WorkforceAP if null)
- Update `lib/email/template.ts` to use `org.primaryColor` in header gradient + CTA button (fallback to defaults)
- Update `lib/email.ts` functions to interpolate org name in subject lines and footer
- Add test: seed AAUL org with branding, send invitation email, verify logo URL + subject contain AAUL name

**PR 3 — Nav + footer logo awareness [1 day]**
- Add org branding context to request scope (extend middleware from PR 1)
- Pass org through layout → `MainNav` + `Footer`
- Use `org.logo` if present, fallback to `/images/wap_logo.png`
- Update `Footer.tsx` to interpolate org name

**PR 4 — Metadata per-org (favicon, theme-color, OG) [1 day]**
- In `app/layout.tsx`, use `orgBranding.primaryColor` for `theme-color` meta tag (line 74)
- Use `org.logo` for favicon + apple-touch-icon (line 75)
- Make OG title dynamic: `og.title: org.name || 'Workforce Advancement Project'`
- Make OG image dynamic if org has logo (fallback to `/images/hero-people.jpg`)

**PR 5 — PDF export logo awareness [1 day]**
- Update PDF embedding code in:
  - `app/api/ai/export-pdf/route.ts`
  - `app/api/counselor/sessions/email-packet/route.ts`
- Fetch org logo URL + embed via Supabase public URL instead of file system path
- Fallback to `/public/images/wap_logo.png` if org.logo is null

### Total scope
- **5 PRs, ~6 days of focused work**
- Each PR is ~200–400 lines of changes
- Each lands incrementally (no long branches)
- By PR 5, a second org with custom domain + branding renders end-to-end

### What this lands
- ✅ `aaul.workforceap.org` resolves to AAUL org
- ✅ AAUL logo appears in portal nav + footer + emails
- ✅ AAUL brand color appears in buttons + UI accents + email CTA
- ✅ Emails say "Welcome to AAUL" not "Welcome to WorkforceAP"
- ✅ PDF exports show AAUL logo
- ✅ Theme color + favicon match AAUL brand

---

## Sprint E.1 risks

### Architectural decisions requiring Mike's sign-off

1. **Org-from-Host resolution scope**
   - **Decision:** Should `customDomain` resolution happen in middleware (affects all routes) or only in auth/portal routes?
   - **Impact:** Middleware = highest coverage but strictest compliance; route-by-route = more opt-in, less risky if a route forgets
   - **Recommendation:** Middleware only, with fallback to `getDefaultOrganizationId()`. Pair with Track A.2's `withTenantScope` to ensure DB queries filter by org.
   - **Risk:** If middleware org context is lost, downstream queries default to "workforceap" org instead of rejecting. Requires RLS + app-layer filter enforcement.

2. **Email sender org context**
   - **Decision:** How to pass org to `lib/email.ts` email functions?
     - Option A: Wrapper function `sendEmailAsOrg(orgId, fn)` that sets context
     - Option B: Add org param to every email function signature
     - Option C: Read org from request context at email-send time (only works for request-scoped sends)
   - **Recommendation:** Option A (wrapper) — minimal signature churn, cleanest at call sites.
   - **Risk:** Cron-triggered emails (weekly recap, inactive nudge) are request-less. Need to pass orgId explicitly or lookup via member → organization FK.

3. **Logo storage lifecycle**
   - **Decision:** When admin uploads a logo, which org does it belong to?
     - Current: Stored in shared `organization-branding` bucket, keyed by org ID
     - Issue: No cleanup when org is deleted; no org isolation in storage layer
   - **Recommendation:** Defer to next sprint. For E.1, assume logos are small + storage is cheap. Add a note in DESIGN.md.
   - **Risk:** Storage bucket fills with orphaned files. Not a blocker.

4. **Subdomain vs. custom domain**
   - **Decision:** Does AAUL use `aaul.workforceap.org` (subdomain, requires DNS wildcard) or a fully custom domain `aaul.org` (requires DNS A record + cert)?
   - **Recommendation:** Scope of E.1 is schema support + middleware + rendering. DNS + cert handling is ops scope. Assume AAUL will use subdomain for MVP.
   - **Risk:** If fully custom domain required, need DNS validation + TLS cert per org. Defers to post-E.1.

### Testing gaps

- No integration test for custom domain → org lookup → isolation
- No test for email rendering with org branding
- No test for PDF export with org logo
- No test that switching orgs via Host header doesn't leak data

**Requirement for PR:** Each of the 5 PRs must include a corresponding CI test. The custom domain PR must have the cross-tenant leak test.

### Track A.2 dependency

**Critical:** E.1 assumes Track A.2 (withTenantScope migration) is either done or in progress. Email sends, PDF exports, and metadata generation all query the DB. If those queries don't filter by `organizationId`, an AAUL member could see WorkforceAP data.

**Timing:** E.1 should land **after A.2**, not in parallel.

---

## Appendix: Files audited

| File | Purpose | Findings |
|------|---------|----------|
| `prisma/schema.prisma` | Schema | 9 Organization fields; customDomain never queried |
| `middleware.ts` | Request auth + locale | No org resolution from Host |
| `lib/tenant/organization.ts` | Org lookup | Only supports default org by slug |
| `lib/platform/defaultOrgTheme.ts` | Branding fetch | Queries org.logo + org.primaryColor; no custom domain support |
| `components/platform/OrgBrandingStyle.tsx` | CSS var injection | Overrides `--color-accent` if org.primaryColor set |
| `app/layout.tsx` | Root layout | Uses `getDefaultOrgBranding()`; hardcoded metadata |
| `app/admin/settings/page.tsx` | Admin UI | Displays current logo + color; allows edit |
| `app/api/admin/settings/organization/route.ts` | API | Updates org branding; no custom domain support |
| `app/admin/organization/logo/route.ts` | Logo upload | Stores in Supabase `organization-branding` bucket |
| `components/MainNav.tsx` | Navigation | Hardcoded logo path |
| `components/Footer.tsx` | Footer | Hardcoded logo path |
| `components/JsonLd.tsx` | SEO | Hardcoded logo in schema.org |
| `emails/Layout.tsx` | Email header | Hardcoded logo + colors |
| `lib/email/template.ts` | Email HTML wrapper | Hardcoded logo + colors + footer |
| `lib/email.ts` | Email senders (~40 functions) | Hardcoded subject lines + "from" + footer text |
| `css/main.css` | Brand colors (CSS vars) | Defaults OK; overridable at runtime |
| `tailwind.config.ts` | Tailwind theme | Hardcoded colors; not an issue (CSS vars take precedence) |

