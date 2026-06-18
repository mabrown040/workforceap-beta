#!/usr/bin/env python3
"""Batch 14 audit trail patch — PII-access and AI generation routes."""

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
# 1. admin/employer-context/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/employer-context/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "    store.set(SUPER_ADMIN_EMPLOYER_COOKIE, employer.id, cookieOpts);\n    return NextResponse.json({ ok: true, employer: { id: employer.id, companyName: employer.companyName } });"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_employer_context_set', targetType: 'User', targetId: user.id, metadata: { employerId: employer.id } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'EmployerContext', id: employer.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: employer-context needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. admin/partner-context/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/partner-context/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "    store.set(SUPER_ADMIN_PARTNER_COOKIE, partner.id, cookieOpts);\n    return NextResponse.json({ ok: true, partner: { id: partner.id, name: partner.name } });"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_partner_context_set', targetType: 'User', targetId: user.id, metadata: { partnerId: partner.id } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'PartnerContext', id: partner.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: partner-context needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. admin/members/enhance-resume/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/enhance-resume/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({\n        enhancedResume: improvedResume,\n        improvementSummary,\n      });"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_member_resume_enhanced', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'EnhancedResume', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: enhance-resume needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. admin/members/parse-resume/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/parse-resume/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ extracted: parsed });"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_member_resume_parsed', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'ParsedResume', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: parse-resume needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. admin/members/[id]/summary/route.ts  POST (inline withApiGuc handler)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/summary/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
# Success path uses `out ??` — distinct from catch path which uses literal string
needle = "      return NextResponse.json({ summary: out ?? 'Summary unavailable, try again.' });"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_member_summary_generated', targetType: 'User', targetId: id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'MemberSummary', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: member-summary needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

print("\nAll batch 14 files patched.")
