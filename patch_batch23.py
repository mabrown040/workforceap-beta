#!/usr/bin/env python3
"""Batch 23: member enroll, set-primary, settings, benefits/request, pre-screening"""

import sys
from pathlib import Path

AUDIT_IMPORT = "import { auditLog } from '@/lib/audit';\nimport { logAuditEvent } from '@/lib/audit/log';\n"


def prepend_imports(content: str) -> str:
    if "from '@/lib/audit'" in content:
        return content
    lines = content.splitlines(keepends=True)
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = i
    if last_import_idx == -1:
        return AUDIT_IMPORT + content
    lines.insert(last_import_idx + 1, AUDIT_IMPORT)
    return "".join(lines)


def insert_before(content: str, needle: str, insertion: str) -> tuple[str, bool]:
    idx = content.find(needle)
    if idx == -1:
        return content, False
    return content[:idx] + insertion + content[idx:], True


def patch(path: str, ops: list[tuple[str, str]]) -> bool:
    p = Path(path)
    if not p.exists():
        print(f"MISSING: {path}")
        return False
    content = p.read_text()
    content = prepend_imports(content)
    ok = True
    for needle, insertion in ops:
        content, success = insert_before(content, needle, insertion)
        if not success:
            print(f"NEEDLE NOT FOUND in {path}:\n  {repr(needle[:80])}")
            ok = False
    if ok:
        p.write_text(content)
        print(f"OK: {path}")
    return ok


errors = 0

# 1. member/enroll POST — program enrollment
errors += not patch(
    "app/api/member/enroll/route.ts",
    [(
        "  return NextResponse.json({ ok: true, programSlug: slug });\n\n  } catch (error) {\n    console.error('/member/enroll error:",
        "  auditLog({ actorUserId: user.id, action: 'member.program.enroll', targetType: 'ProgramEnrollment', targetId: slug }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'ProgramEnrollment', id: slug }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/enrollments/[id]/set-primary POST — only the changed=true path (actual mutation)
errors += not patch(
    "app/api/member/enrollments/[id]/set-primary/route.ts",
    [(
        "  return NextResponse.json({\n    ok: true,\n    enrollmentId: enrollment.id,\n    programSlug: enrollment.programSlug,\n    changed: true,\n  });\n\n  } catch (error) {\n    console.error('/member/enrollments/[id]/set-primary error:",
        "  auditLog({ actorUserId: user.id, action: 'member.enrollment.setPrimary', targetType: 'CourseEnrollment', targetId: enrollment.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'CourseEnrollment', id: enrollment.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 3. member/settings PATCH
errors += not patch(
    "app/api/member/settings/route.ts",
    [(
        "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/member/settings error:",
        "  auditLog({ actorUserId: user.id, action: 'member.settings.update', targetType: 'MemberSettings', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'MemberSettings', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 4. member/benefits/request POST
errors += not patch(
    "app/api/member/benefits/request/route.ts",
    [(
        "  return NextResponse.json({ request: req, status: 'pending' });\n\n  } catch (error) {\n    console.error('/member/benefits/request error:",
        "  auditLog({ actorUserId: user.id, action: 'member.benefit.request', targetType: 'BenefitRequest', targetId: req.id, metadata: { benefit } }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'BenefitRequest', id: req.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 5. member/pre-screening POST
errors += not patch(
    "app/api/member/pre-screening/route.ts",
    [(
        "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/member/pre-screening error:",
        "  auditLog({ actorUserId: user.id, action: 'member.preScreening.submit', targetType: 'PreScreening', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'PreScreening', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 5 patches applied successfully")
