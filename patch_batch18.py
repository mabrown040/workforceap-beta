#!/usr/bin/env python3
"""Batch 18 audit trail patch — counselor mutations on member data."""

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
# 1. counselor/placements/route.ts  POST (withApiGuc named fn, actor=user, target=userId)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/placements/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, placement: (placement as any[])[0] });\n\n  } catch (error) {\n    console.error('/counselor/placements error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'counselor_placement_recorded', targetType: 'User', targetId: userId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'Placement', id: userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. counselor/members/[memberId]/notes/route.ts  POST (withApiGuc named fn, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/members/[memberId]/notes/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json(note, { status: 201 });\n\n  } catch (error) {\n    console.error('/counselor/members/[memberId]/notes error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'counselor_note_created', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'CounselorNote', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. counselor/members/[memberId]/award-points/route.ts  POST (withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/members/[memberId]/award-points/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, ...result });\n\n  } catch (error) {\n    console.error('/counselor/members/[memberId]/award-points error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'counselor_points_awarded', targetType: 'User', targetId: memberId, metadata: { points } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'PointsAward', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. counselor/sessions/upload-resume/route.ts  POST (inline withApiGuc, actor=user)
#    target = authorizedMemberId (resolved via resolveActOnBehalf)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/sessions/upload-resume/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ ok: true, text: text.slice(0, 8000) });\n  } catch (error) {\n    console.error('/counselor/sessions/upload-resume:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'counselor_resume_uploaded', targetType: 'User', targetId: authorizedMemberId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'updated', object: { type: 'MemberResume', id: authorizedMemberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. counselor/bulk-followup/route.ts  POST (withApiGuc, actor=user, bulk target)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/bulk-followup/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({\n      ok: true,\n      template: { id: template.id, name: template.name, subject: template.subject },\n      sent,\n      failed,\n      results,\n    });\n  } catch (err) {\n    console.error('/api/counselor/bulk-followup error:', err);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'counselor_bulk_followup_sent', targetType: 'User', targetId: user.id, metadata: { sent, failed } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'BulkFollowup', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 6. counselor/members/[memberId]/messages/route.ts  POST (withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/members/[memberId]/messages/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ message: serializeMessage(msg) });\n\n  } catch (error) {\n    console.error('/counselor/members/[memberId]/messages error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'counselor_message_sent', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'Message', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 7. counselor/members/[memberId]/session-notes/route.ts  POST (withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/members/[memberId]/session-notes/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json(note, { status: 201 });\n  } catch (error) {\n    console.error('/counselor/members/[memberId]/session-notes error:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'counselor_session_note_created', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'SessionNote', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 8. counselor/members/[memberId]/session-notes/route.ts  DELETE (withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
# Same file — needle uses { ok: true } which is unique to the DELETE handler
p = "app/api/counselor/members/[memberId]/session-notes/route.ts"
with open(p) as f: c = f.read()
needle = "    return NextResponse.json({ ok: true });\n  } catch (error) {\n    console.error('/counselor/members/[memberId]/session-notes error:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'counselor_session_note_deleted', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'deleted', object: { type: 'SessionNote', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} DELETE needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p} (DELETE)")

print("\nAll batch 18 files patched.")
