#!/usr/bin/env python3
"""Batch 21 audit trail patch — member self-service key mutations."""

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
# 1. member/enroll/route.ts  POST (inline withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/member/enroll/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, programSlug: slug });\n\n  } catch (error) {\n    console.error('/member/enroll error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'member_program_enrolled', targetType: 'User', targetId: user.id, metadata: { programSlug: slug } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'created', object: { type: 'ProgramEnrollment', id: slug }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. member/profile/route.ts  PATCH (withApiGuc named fn, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/member/profile/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = (
    "  return NextResponse.json({\n"
    "    user: updated\n"
    "      ? {\n"
    "          id: updated.id,\n"
    "          email: updated.email,\n"
    "          fullName: updated.fullName,\n"
    "          phone: updated.phone,\n"
    "        }\n"
    "      : null,\n"
    "    profile: updated?.profile\n"
    "      ? {\n"
    "          address: updated.profile.address,\n"
    "          city: updated.profile.city,\n"
    "          state: updated.profile.state,\n"
    "          zip: updated.profile.zip,\n"
    "        }\n"
    "      : null,\n"
    "  });\n\n"
    "  } catch (error) {\n"
    "    console.error('/member/profile error:', error);"
)
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'member_profile_updated', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'updated', object: { type: 'MemberProfile', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. member/settings/route.ts  PATCH (inline withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/member/settings/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/member/settings error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'member_settings_updated', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'updated', object: { type: 'MemberSettings', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. member/certifications/route.ts  POST (withApiGuc named fn, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/member/certifications/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ success: true });\n\n  } catch (error) {\n    console.error('/member/certifications error:', error);"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'member_certification_updated', targetType: 'User', targetId: user.id, metadata: { certName } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'updated', object: { type: 'MemberCertification', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. member/assessment/submit/route.ts  POST (inline withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/member/assessment/submit/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({\n      ok: true,\n      rawScore: raw,\n      scorePct: pct,\n      emailsSent: memberEmailSent,\n      adminEmailSent,\n    });\n  } catch (error) {\n    console.error('/member/assessment/submit:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'member_assessment_submitted', targetType: 'User', targetId: user.id, metadata: { rawScore: raw, scorePct: pct } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'created', object: { type: 'Assessment', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 6. member/assessment/reset/route.ts  POST (inline withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/member/assessment/reset/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ ok: true, message: 'Assessment reset. You can now retake from the dashboard.' });\n  } catch (error) {\n    console.error('/member/assessment/reset:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'member_assessment_reset', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'deleted', object: { type: 'Assessment', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

print("\nAll batch 21 files patched.")
