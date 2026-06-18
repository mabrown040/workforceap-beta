#!/usr/bin/env python3
"""Batch 26: application-onboarding, pathway-steps/complete, resources/progress, pitch-deployments"""

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

# 1. member/application-onboarding PATCH
errors += not patch(
    "app/api/member/application-onboarding/route.ts",
    [(
        "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/member/application-onboarding error:",
        "  auditLog({ actorUserId: user.id, action: 'member.applicationOnboarding.update', targetType: 'ApplicationOnboarding', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'ApplicationOnboarding', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/pathway-steps/[pathwayId]/[stepIndex]/complete POST
errors += not patch(
    "app/api/member/pathway-steps/[pathwayId]/[stepIndex]/complete/route.ts",
    [(
        "      return NextResponse.json({ progress });\n    } catch (err) {\n      console.error('[POST pathway step complete]', err);",
        "      auditLog({ actorUserId: user.id, action: 'member.pathwayStep.complete', targetType: 'PathwayProgress', targetId: pathwayId }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'PathwayProgress', id: pathwayId }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 3. member/resources/[id]/progress POST
errors += not patch(
    "app/api/member/resources/[id]/progress/route.ts",
    [(
        "      return NextResponse.json({ progress });\n    } catch (err) {\n      console.error('[POST /api/member/resources/:id/progress]', err);",
        "      auditLog({ actorUserId: user.id, action: 'member.resourceProgress.update', targetType: 'ResourceProgress', targetId: resourceId }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'ResourceProgress', id: resourceId }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 4. member/pitch-deployments POST
errors += not patch(
    "app/api/member/pitch-deployments/route.ts",
    [(
        "  return NextResponse.json({ deployment: event });\n\n  } catch (error) {\n    console.error('/member/pitch-deployments error:",
        "  auditLog({ actorUserId: user.id, action: 'member.pitchDeployment.create', targetType: 'PitchDeployment', targetId: event.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'PitchDeployment', id: event.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 4 patches applied successfully")
