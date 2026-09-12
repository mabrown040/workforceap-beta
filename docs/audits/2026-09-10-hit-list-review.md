# WAP-12–40: review and execution order

Reviewed 2026-09-10 against master `73da51f22a03fb265db942927a905af3c01651bf`
and all 29 full Linear descriptions. Issue evidence is a starting point; historical
event counts are not independently remeasured unless explicitly stated below.

## Started: WAP-12 anonymous access containment

A read-only production catalog inspection at 04:16 UTC independently confirmed:

- All 114 public relations are owned by `postgres` and grant anonymous writes.
  Grants alone do not prove every table is exploitable: RLS still applies.
- `public_wioa_screenings_insert_public` allows PUBLIC INSERT with `true`.
  Together with the INSERT grant, this bypasses application validation.
- Three new security-definer helpers allow anonymous EXECUTE.
- Three trigger functions lack a pinned search path.
- Public-schema default grants expose future objects created by both `postgres`
  and the managed `supabase_admin` role. No unresolved migration rows were found.

First patch: additive migration `20260910050000_contain_anonymous_public_access`.
It drops the open WIOA insert policy, removes anonymous/PUBLIC table, column,
sequence and function privileges, removes anonymous defaults for the application
owner, and pins the three trigger search paths. Global PUBLIC function defaults
must be revoked too; a schema-only default revocation cannot override them.

Repository tracing found no direct browser public-table reads/writes or RPC calls;
WIOA submissions use Prisma through `/api/public/wioa-qualification`. However,
five messaging clients subscribe to `postgres_changes` on `messages` and/or
`message_threads`. Read receipts use application APIs. Therefore the issue's
claim that the Data API is unused is insufficient to justify immediately removing
all authenticated privileges. The patch preserves existing authenticated EXECUTE,
including inheritance from PUBLIC, without reopening older backend-only helpers.
It leaves authenticated table/column grants unchanged. Storage schema is outside
this patch. Existing GUC-based RLS helpers also require a separate realtime/JWT
review; preserving privileges is not proof that realtime currently works.

**WAP-12 remains in progress. This is a containment patch, not full acceptance.**
Outstanding: managed `supabase_admin` defaults (do not silently skip a denied
ALTER DEFAULT PRIVILEGES), authenticated grants/helper access, production/demo
deployment, effective catalog checks afterward, advisor results, and five-role
portal/action/realtime acceptance. The managed defaults can reintroduce access
when that owner creates new objects; they must be explicitly resolved before
closing the issue. Do not enable FORCE RLS as part of this patch.

Proof: `tests/rls/anonymous-db-access.mjs` creates and removes a dedicated local
database and NOLOGIN roles. Its 19 checks reproduce the open insert, deny it after
the migration, test direct/column/RPC/sequence denial and future-object defaults,
preserve backend writes/authenticated grants/storage access, verify pinned paths,
and exercise repeat application. This is synthetic PostgreSQL evidence, not a
live PostgREST or portal test. No production mutations or outbound messages were
performed during this review.

## Next: incident fixes and runtime evidence

| Issue | First action and acceptance boundary |
| --- | --- |
| WAP-13 | Privately verify production Redis credentials and bypass flags; prove normal and throttled requests. Add limiter state to readiness and repair native contact POST. CI stub configuration is not production evidence. |
| WAP-14 | Fix shared email retry/pacing and fixture-recipient filtering; coordinate cron spacing with WAP-17. Make Discord delivery durable. Two clean Sunday recaps are required before closure. |
| WAP-15 | Add the missing `dashboard` namespace to the admin message slice, test transitive client namespace coverage, and gate locale completeness. The missing slice entry is confirmed in source. |
| WAP-16 | Reproduce the hooks regression from its actual replay before changing hook placement. Stabilize weekly-recap date rendering and capture hydration context. Require a quiet production week. |
| WAP-17 | Verify actual pool URL/settings privately; enforce the agreed configuration. Reduce cron-state scans, retain diagnostics for a bounded period, and stagger crons jointly with WAP-14. Require seven days without P2024. |
| WAP-19 | Bring orphaned tests into exactly one runner before relying on green CI for later fixes. Repair the three reported failures; reconcile catalog hours with the named curriculum owner. |
| WAP-28 | Add signup race compensation/recovery tests, catch service-worker update failures, and reconcile orphan identities using evidence. Resolve Sentry issues only against the fixing release and verified quiet period. |
| WAP-29 | Distinguish expired-session noise from transient auth infrastructure failures; test bounded retry and preserve genuine error reporting. |

## Integrity, isolation and operational controls

| Issue | First action and acceptance boundary |
| --- | --- |
| WAP-18 | Inventory actual mutation handlers, complete audit coverage and scoped wrappers, then add a CI ratchet with explicit read-only exemptions. Audit field names, not member PII. |
| WAP-20 | Separate self-report from verified credentials across rewards and reports. Prepare the data/report impact and staff explanation; the issue explicitly requires Mike's approval before merge. Do not invent issuer verification for historical rows. |
| WAP-21 | Ratchet the existing duplicate timestamp baseline and remove recurring recovery noise. Never rename or rewrite applied migrations. |
| WAP-24 | Schedule and persist the FORCE RLS shadow evidence; ratchet tenant scoping. No production FORCE switch until the 30-run rehearsal and app-role prerequisites pass. |
| WAP-25 | Inventory demo migration history and drift first. Fresh migration replay is known to fail; replacing preview patches with unconditional `migrate deploy` is not yet a safe fix. Prove apply/school enrollment on the reconciled preview. |
| WAP-26 | Verify availability/settings of leaked-password protection and test weak-password UX. Review fixture identities individually before tagging or deleting; a name/email pattern alone is not enough. |
| WAP-33 | Validate index usage and migration locking, trim repeated empty xAPI updates, and define retention/reprocessing safeguards before deletion. |
| WAP-34 | Check the installed Stripe SDK/event contract and update subscription item handling with webhook fixtures. Keep disabled billing behind its existing gate. |
| WAP-35 | Preserve fail-closed recovery on conflicting identities. Build an evidence-backed reconciliation path; do not revive the old blanket unban workaround. |
| WAP-36 | Introduce nonce CSP in report-only mode, inspect real reports for a week, then enforce after Next/Astro compatibility checks. |

## User value and maintainability

| Issue | First action and acceptance boundary |
| --- | --- |
| WAP-22 | Port the identified accessibility fixes using the singleton announcement hook; repair form labels and verify keyboard/screen-reader outcomes. |
| WAP-23 | Remove unsupported salary claims from structured data first and then remaining consumers; preserve the homepage vision and honor locked-file review rules. |
| WAP-27 | Deduplicate current-user/notification fetching, pause hidden-tab polling and prove the request count in a browser trace. Measure the weekly invocation share afterward. |
| WAP-30 | Align member/counselor inactivity definitions and alert queries; retain distinct partner/readiness meanings rather than treating every risk label as equivalent. |
| WAP-31 | Establish the verified placement/wage and repeated-job product contract before changing JobEpisode schema or reported outcomes. |
| WAP-32 | Persist referral attribution at an identified conversion. Define the cross-device identity link explicitly; cookies alone cannot attribute an unlinked second device. |
| WAP-37 | Configure dead-code analysis for dynamic imports/build tooling before deleting reported files; remove confirmed dead paths and align Node pins. |
| WAP-38 | Paginate the partner queue, preserve notes/scroll on save, and expose per-action errors; prove older records remain reachable. |
| WAP-39 | Define event vocabulary and legacy aliases, validate public event input, then migrate callers/data without losing historical analytics. |
| WAP-40 | Repair icons and stale-route redirects with correct semantics; publish association files only for real app identities. |

Keep separate PRs for security containment, rendering, email delivery, runtime
configuration, and report semantics. Link actual proof to each issue; do not close
an issue merely because its implementation PR merged.
