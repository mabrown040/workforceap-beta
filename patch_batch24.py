#!/usr/bin/env python3
"""Batch 24: member applications, assessment/reset, interview-request, program-change-request"""

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

# 1. member/applications POST (create job application — simple tracker variant)
errors += not patch(
    "app/api/member/applications/route.ts",
    [(
        "      return NextResponse.json({ application: app });\n    } catch (err) {\n      captureApiError(err, { route: 'member/applications POST' })",
        "      auditLog({ actorUserId: user.id, action: 'member.application.create', targetType: 'JobApplication', targetId: app.id }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'JobApplication', id: app.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/applications/[id] PATCH + 3. DELETE
errors += not patch(
    "app/api/member/applications/[id]/route.ts",
    [
        (
            "      return NextResponse.json({ application: app });\n    } catch (err) {\n      console.error('[PATCH /api/member/applications/:id]', err);",
            "      auditLog({ actorUserId: user.id, action: 'member.application.update', targetType: 'JobApplication', targetId: id }).catch(() => {});\n"
            "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'JobApplication', id }, result: { success: true } }).catch(() => {});\n",
        ),
        (
            "      return NextResponse.json({ success: true });\n    } catch (err) {\n      console.error('[DELETE /api/member/applications/:id]', err);",
            "      auditLog({ actorUserId: user.id, action: 'member.application.delete', targetType: 'JobApplication', targetId: id }).catch(() => {});\n"
            "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'delete', object: { type: 'JobApplication', id }, result: { success: true } }).catch(() => {});\n",
        ),
    ],
)

# 4. member/assessment/reset POST
errors += not patch(
    "app/api/member/assessment/reset/route.ts",
    [(
        "    return NextResponse.json({ ok: true, message: 'Assessment reset. You can now retake from the dashboard.' });\n  } catch (error) {\n    console.error('/member/assessment/reset:",
        "    auditLog({ actorUserId: user.id, action: 'member.assessment.reset', targetType: 'AssessmentReset', targetId: user.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'AssessmentReset', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 5. member/interview-request POST (only the actual mutation path — not the alreadyRequested early return)
errors += not patch(
    "app/api/member/interview-request/route.ts",
    [(
        "  return NextResponse.json({ ok: true });\n  } catch {\n    return NextResponse.json({ error: 'Failed to process interview request' }",
        "  auditLog({ actorUserId: user.id, action: 'member.interviewRequest.create', targetType: 'InterviewRequest', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'InterviewRequest', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 6. member/program-change-request POST
errors += not patch(
    "app/api/member/program-change-request/route.ts",
    [(
        "    return NextResponse.json({ ok: true, id: row.id });\n  } catch (error) {\n    captureApiError(error, { route: 'POST /api/member/program-change-request' })",
        "    auditLog({ actorUserId: user.id, action: 'member.programChangeRequest.create', targetType: 'ProgramChangeRequest', targetId: row.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'ProgramChangeRequest', id: row.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 6 patches applied successfully")
