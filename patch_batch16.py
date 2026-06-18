#!/usr/bin/env python3
"""Batch 16 audit trail patch — Coursera ops, onet, webhooks, job matches."""

AL_IMPORT = "import { auditLog } from '@/lib/audit';\n"
LAE_IMPORT = "import { logAuditEvent } from '@/lib/audit/log';\n"

def prepend_imports(content):
    to_add = ""
    if "from '@/lib/audit'" not in content:
        to_add += AL_IMPORT
    if "logAuditEvent" not in content:
        to_add += LAE_IMPORT
    if not to_add:
        return content
    lines = content.split('\n')
    last_import_idx = 0
    in_import = False
    for i, line in enumerate(lines):
        if line.startswith('import '):
            in_import = True
        if in_import and line.strip().endswith(';'):
            last_import_idx = i
            in_import = False
    lines.insert(last_import_idx + 1, to_add.rstrip('\n'))
    return '\n'.join(lines)

def insert_before(content, needle, insertion):
    idx = content.find(needle)
    if idx == -1:
        return content, False
    return content[:idx] + insertion + content[idx:], True

# ──────────────────────────────────────────────────────────────────────────────
# 1. admin/coursera/auto-heal/route.ts  POST (bare export, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/auto-heal/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ ok: true, result });\n    } catch (error) {\n      const message = error instanceof Error ? error.message : 'Auto-heal failed'"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_coursera_auto_heal', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraAutoHeal', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. admin/coursera/sync-b4b/route.ts  POST (bare export, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/sync-b4b/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ ok: true, result });\n    } catch (err) {\n      captureApiError(err, { route: 'admin/coursera/sync-b4b' }"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_coursera_sync_b4b_triggered', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSyncB4BTrigger', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. admin/coursera/sync-progress/route.ts  POST (withApiGuc, actor=admin)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/sync-progress/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({\n    xapi,\n    csvPromotion,"
insertion = (
    "  void auditLog({ actorUserId: admin.id, action: 'admin_coursera_sync_progress', targetType: 'User', targetId: admin.id, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: admin.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSyncProgress', id: admin.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. admin/coursera/map-unmatched/route.ts  POST (bare export, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/map-unmatched/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
# Success return has: ok, mapping, backfill, xapiReplay
needle = "      return NextResponse.json({\n        ok: true,\n        mapping,\n        backfill,\n        xapiReplay,"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_coursera_learner_mapped', targetType: 'User', targetId: userId, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraIdentityMapping', id: userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. admin/coursera/reconcile/add-to-wap/route.ts  POST (withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/reconcile/add-to-wap/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({\n        ok: true,\n        userId: result.id,"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_coursera_reconcile_add_to_wap', targetType: 'User', targetId: result.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraReconcileWapUser', id: result.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 6. admin/coursera/seed-canonical-mappings-from-b4b/route.ts (bare, actor=actor)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/seed-canonical-mappings-from-b4b/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json(summary);\n    } catch (err) {\n      captureApiError(err, { route: 'admin/coursera/seed-canonical-mappings-from-b4b' }"
insertion = (
    "      void auditLog({ actorUserId: actor.id, action: 'admin_coursera_seed_mappings_b4b', targetType: 'User', targetId: actor.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: actor.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSeedMappingsB4B', id: actor.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 7. admin/coursera/seed-canonical-mappings-from-catalog/route.ts (bare, actor=actor)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/seed-canonical-mappings-from-catalog/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json(summary);\n    } catch (err) {\n      captureApiError(err, { route: 'admin/coursera/seed-canonical-mappings-from-catalog' }"
insertion = (
    "      void auditLog({ actorUserId: actor.id, action: 'admin_coursera_seed_mappings_catalog', targetType: 'User', targetId: actor.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: actor.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSeedMappingsCatalog', id: actor.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 8. admin/coursera/mappings/route.ts  POST (bare, actor=ctx.user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/coursera/mappings/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
# Success return has: ok, mapping, backfill, reprocessed (distinct from map-unmatched)
needle = "      return NextResponse.json({\n        ok: true,\n        mapping,\n        backfill,\n        reprocessed:"
insertion = (
    "      void auditLog({ actorUserId: ctx.user.id, action: 'admin_coursera_mapping_saved', targetType: 'User', targetId: body.userId?.trim() ?? ctx.user.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: ctx.user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraIdentityMapping', id: body.userId?.trim() ?? ctx.user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 9. admin/onet/sync/route.ts  POST — two success paths (allMapped / onetCodes)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/onet/sync/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)

# allMapped path (unique: followed by blank line + "if (onetCodes")
needle = "    return NextResponse.json({ ok: true, synced, errors });\n  }\n\n  if (onetCodes"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_onet_sync', targetType: 'User', targetId: user.id, metadata: { allMapped: true } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'OnetSync', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} allMapped needle not found")

# onetCodes path (unique: followed by blank line + 'return NextResponse.json({ error: "Provide')
needle = "    return NextResponse.json({ ok: true, synced: ok, errors });\n  }\n\n  return NextResponse.json({ error: 'Provide onetCodes"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_onet_sync', targetType: 'User', targetId: user.id, metadata: { onetCodes: true } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'OnetSync', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} onetCodes needle not found")

with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 10. admin/webhooks/process-retries/route.ts  POST (bare export, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/webhooks/process-retries/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({\n      processed: results.length,\n      summary: byResult,"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_webhook_retries_processed', targetType: 'User', targetId: user.id, metadata: { processed: results.length } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'WebhookRetryBatch', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 11. admin/jobs/[id]/suggest-matches/route.ts  POST (withApiGuc, actor=user)
#     Already has recordSuggestAudit — still need standard dual audit trail
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/jobs/[id]/suggest-matches/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({\n      ok: true,\n      count: matchCount,\n      testMode,"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_job_match_suggestions_sent', targetType: 'User', targetId: user.id, metadata: { jobId: id, count: matchCount } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'JobMatchSuggestions', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

print("\nAll batch 16 files patched.")
