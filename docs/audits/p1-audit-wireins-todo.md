# P1 xAPI audit wire-ins — remaining paths

`logAuditEvent` from `@/lib/audit/log` is wired on three representative paths:

| Path | Verb | Object |
|------|------|--------|
| `app/api/admin/partners/[id]/approve/route.ts` | `approved` | `Partner` |
| `app/api/admin/members/[id]/delete/route.ts` | `deleted` | `User` |
| `app/admin/pipeline/remindAction.ts` | `launched` | `Application` |

## API routes (`app/api/admin/**/route.ts`)

Wire **mutations** (POST/PATCH/PUT/DELETE) after a successful write. Pass `orgId` from `getActorOrganizationId`, and `auditRequestMeta(request)` when a `Request` is available.

### High priority (destructive / compliance)

- [x] `members/[id]/erase/route.ts` — `deleted` / `voided`, `User`
- [x] `members/[id]/status/route.ts` — xAPI wire-in added; legacy `auditLog()` kept during transition
- [x] `program-change-requests/[id]/route.ts` — `approved` / `voided`, `ProgramChangeRequest`
- [x] `employers/[id]/approve/route.ts`, `reject`, `deactivate`, `reactivate`
- [x] `partners/[id]/reject`, `deactivate`, `reactivate`
- [x] `invites/[id]/revoke/route.ts`
- [x] `users/[id]/route.ts`, `users/[id]/restore/route.ts`

### Exports & bulk (PII access)

- [x] `members/export/route.ts` — legacy `auditLog` plus xAPI-shaped `logAuditEvent`
- [x] `cohort-export/route.ts` — legacy `auditLog` plus xAPI-shaped `logAuditEvent`
- [x] `employers/export/route.ts`, `partners/export/route.ts` — legacy `auditLog` plus xAPI-shaped `logAuditEvent`
- [x] `reports/wioa/route.ts` — legacy `auditLog` plus xAPI-shaped `logAuditEvent`
- [ ] `members/bulk-email/route.ts`, `members/bulk-update/route.ts`

### Settings & configuration

- [ ] `settings/organization/route.ts`
- [ ] `organization/logo/route.ts`
- [ ] `feature-flags/route.ts`, `feature-flags/[id]/route.ts`
- [ ] `email-templates/[id]/route.ts`

## Server actions

Portal admin actions live under `app/admin/**` (not `app/(portal)/admin`). Wire the same pattern: `withAuthGuc` + `logAuditEvent` after success.

- [x] `app/admin/members/[id]/introduceAction.ts`
- [ ] Other `*Action.ts` files under `app/admin/**`

## Legacy `auditLog()` (`lib/audit.ts`)

Several routes still call `auditLog()`. Keep both during transition or replace with `logAuditEvent` and deprecate `auditLog` once coverage is complete.

## Checklist per wire-in

1. Resolve `orgId` via `getActorOrganizationId(actorId)` (or super-admin tenant filter).
2. Call `logAuditEvent({ user: { id, role }, verb, object, result: { success: true }, request, orgId })`.
3. Use ADL verb ids where they exist (`approved`, `deleted`, `voided`, `launched`) or `https://workforceap.org/xapi/verbs/<slug>`.
4. On failure paths, optionally log `result: { success: false }` before returning the error response.
