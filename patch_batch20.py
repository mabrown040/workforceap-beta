#!/usr/bin/env python3
"""Batch 20 audit trail patch — auth security events (login, MFA verify)."""

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
# 1. auth/login/route.ts  POST (inline withApiGuc, actor=data.user.id)
#    Audit the normal successful login path (non-MFA). MFA paths handled by
#    verify-mfa. Injection point: right before lastLoginAt update.
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/auth/login/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  await prisma.$transaction((tx) =>\n    tx.user.update({\n      where: { id: data.user.id },\n      data: { lastLoginAt: new Date() },\n    }),\n  ).catch((err) => {"
insertion = (
    "  void auditLog({ actorUserId: data.user.id, action: 'user_login', targetType: 'User', targetId: data.user.id, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: data.user.id, role: 'member' }, verb: 'login', object: { type: 'Session', id: data.user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. auth/verify-mfa/route.ts  POST (bare export, actor=verifyData.user.id)
#    Completes MFA 2FA challenge → session upgraded to aal2
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/auth/verify-mfa/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, aal: 'aal2' }, { headers: { 'Cache-Control': 'no-store' } });\n\n  } catch (error) {\n    logger.error('/auth/verify-mfa error', { err: error });"
insertion = (
    "  void auditLog({ actorUserId: verifyData.user.id, action: 'user_mfa_verified', targetType: 'User', targetId: verifyData.user.id, metadata: { trustDevice } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: verifyData.user.id, role: 'member' }, verb: 'login', object: { type: 'MFASession', id: verifyData.user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

print("\nAll batch 20 files patched.")
