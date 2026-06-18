#!/usr/bin/env python3
"""Batch 22: member self-service routes — job-applications, courses/complete, goals, nba"""

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

# 1. member/job-applications POST
errors += not patch(
    "app/api/member/job-applications/route.ts",
    [(
        "    return NextResponse.json(\n      {\n        application,\n        promptAiFeedback,",
        "    auditLog({ actorUserId: user.id, action: 'member.jobApplication.create', targetType: 'JobApplication', targetId: application.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'JobApplication', id: application.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/job-applications/[id] PATCH
errors += not patch(
    "app/api/member/job-applications/[id]/route.ts",
    [(
        "      return NextResponse.json(application);\n    } catch (error) {\n      console.error('[PATCH /api/member/job-applications/:id]'",
        "      auditLog({ actorUserId: user.id, action: 'member.jobApplication.update', targetType: 'JobApplication', targetId: id }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'JobApplication', id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 3. member/courses/complete POST
errors += not patch(
    "app/api/member/courses/complete/route.ts",
    [(
        "      return NextResponse.json(result);\n    } catch (error) {\n      const message",
        "      auditLog({ actorUserId: user.id, action: 'member.course.complete', targetType: 'CourseCompletion', targetId: user.id, metadata: { courseSlug } }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'CourseCompletion', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 4. member/goals POST
errors += not patch(
    "app/api/member/goals/route.ts",
    [(
        "      return NextResponse.json({ goal });\n    } catch (err) {\n      captureApiError(err, { route: 'member/goals POST' })",
        "      auditLog({ actorUserId: user.id, action: 'member.goal.create', targetType: 'Goal', targetId: goal.id }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'Goal', id: goal.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 5. member/goals/[id] PATCH + 6. DELETE (same file)
errors += not patch(
    "app/api/member/goals/[id]/route.ts",
    [
        (
            "  return NextResponse.json({ goal });\n\n  } catch (error) {\n    console.error('/member/goals/[id] error:'",
            "  auditLog({ actorUserId: user.id, action: 'member.goal.update', targetType: 'Goal', targetId: id }).catch(() => {});\n"
            "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Goal', id }, result: { success: true } }).catch(() => {});\n",
        ),
        (
            "  return NextResponse.json({ success: true });\n\n  } catch (error) {\n    console.error('/member/goals/[id] error:'",
            "  auditLog({ actorUserId: user.id, action: 'member.goal.delete', targetType: 'Goal', targetId: id }).catch(() => {});\n"
            "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'delete', object: { type: 'Goal', id }, result: { success: true } }).catch(() => {});\n",
        ),
    ],
)

# 7. member/nba/[id] PATCH
errors += not patch(
    "app/api/member/nba/[id]/route.ts",
    [(
        "    return NextResponse.json({ ok: true });\n  } catch {\n    // Row not found or not owned by this user",
        "    auditLog({ actorUserId: user.id, action: 'member.nba.dismiss', targetType: 'MemberNextBestAction', targetId: id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'MemberNextBestAction', id }, result: { success: true } }).catch(() => {});\n",
    )],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 7 patches applied successfully")
