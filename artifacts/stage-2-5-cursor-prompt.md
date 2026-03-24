# Portal selective-expansion sprint — execution report

**Repo:** `mabrown040/workforceap-beta`  
**Branch at delivery:** `cursor/rollout-stages-2-5-c624` (merge to `master` per release process)

## P0 / P1 checklist

| Item | Status |
|------|--------|
| P0 Employer work queue (Needs review today, Stale >48h, Interview pending, urgency, one-click actions, responsive) | ✅ |
| P0 Partner attention queue v2 (risk tier, next action, owner assign) | ✅ |
| P0 Shared sidebar badges v2 (counts from queue queries) | ✅ |
| P0 Workflow activity timeline (employer + partner, events on status/notes/job/outreach/assign) | ✅ |
| P1 Saved views + quick filters (employer role/stage, partner cohort/milestone) | ❌ (partial: `?focus=` on work queue, `?tier=` on attention only) |
| P1 Outcome ops export preset | ✅ (`?preset=outcomes`) |
| P1 Member transparency (application status + what’s next) | ✅ (Application Tracker page) |

## Migrations / deploy

Apply in order on each environment:

1. `20260323180000_portal_expansion_outreach` (if not yet applied) — `employer_notes`, `status_updated_at`, `partner_outreach_logs`
2. **`20260324120000_portal_workflow_events`** — `portal_workflow_events`, `partner_referrals.assigned_partner_user_id`

**Command:** `npm run db:migrate:deploy` (or your CI equivalent).  
Until migrations run, workflow timeline writes and assignee column will fail at runtime.

## Commands run (validation)

| Command | Result |
|---------|--------|
| `npx prisma generate` | Pass |
| `npx tsc --noEmit` | Pass |
| `npm run test:unit` | Pass |
| `npm run build` | Pass (expected Prisma `127.0.0.1:5432` noise without DB) |

## Changed files (this sprint)

- `prisma/schema.prisma`, `prisma/migrations/20260324120000_portal_workflow_events/migration.sql`
- `lib/portal/workflowEvents.ts`, `lib/employer/workQueue.ts`, `lib/partner/attentionQueue.ts`, `lib/portal/navBadges.ts`, `lib/nav/portalNav.ts`
- `app/api/employer/applications/[id]/route.ts`, `app/api/employer/jobs/[id]/route.ts`, `app/api/partner/outreach/route.ts`, `app/api/partner/members/needs-attention/route.ts`, `app/api/partner/referrals/[memberId]/route.ts`, `app/api/partner/team-assign/route.ts`, `app/api/partner/export/referrals/route.ts`
- `app/(portal)/employer/work-queue/page.tsx`, `app/(portal)/partner/attention/page.tsx`, `app/(portal)/partner/exports/page.tsx`, `app/(portal)/dashboard/ai-tools/application-tracker/page.tsx`
- `components/employer/EmployerWorkQueueClient.tsx`, `EmployerWorkflowTimeline.tsx`, `components/partner/PartnerAttentionClient.tsx`, `PartnerWorkflowTimeline.tsx`, `components/portal/MemberJobPostingTransparency.tsx`
- `css/main.css`

## Remaining risks / follow-ups

- **History:** Timeline only records events from this release forward (no backfill of old application changes).
- **Employer “review today”:** Uses UTC day boundary for “today” on `appliedAt`.
- **Partner badge:** `partner_needs_attention` counts referrals with risk tier ≠ `watch` (stale ≥ 3 days in applied/enrolled); may differ from older 7-day-only semantics.
- **P1 gaps:** Deeper saved views (persisted filters, cohort exports) not built; consider follow-up task.
- **Super-admin partner assign:** Assignee list is partner users on the same partner; super-admin without `PartnerUser` row may have empty assign list until modeled.

## Commit hashes

- **Commit A (P0):** `062d547` — `Portal sprint P0: employer work queue, partner attention v2, workflow timeline, badges`
- **Commit B (P1 + artifact):** tip commit with subject `Portal sprint P1: outcomes export preset, member job transparency, sprint artifact` (run `git log -2 --oneline` on this branch)
