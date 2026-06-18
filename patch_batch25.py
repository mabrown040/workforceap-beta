#!/usr/bin/env python3
"""Batch 25: eligibility, wioa-qualification, dashboard-profile, skill-assessment, feedback, learning-progress"""

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

# 1. member/eligibility PATCH (WIOA eligibility form submission)
errors += not patch(
    "app/api/member/eligibility/route.ts",
    [(
        "    return NextResponse.json({ ok: true });\n  } catch (error) {\n    console.error('/member/eligibility error:",
        "    auditLog({ actorUserId: user.id, action: 'member.eligibility.update', targetType: 'EligibilityForm', targetId: user.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'EligibilityForm', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/wioa-qualification POST
errors += not patch(
    "app/api/member/wioa-qualification/route.ts",
    [(
        "  return NextResponse.json({ ok: true, snapshot, emailSent });\n\n  } catch (error) {\n    console.error('/member/wioa-qualification error:",
        "  auditLog({ actorUserId: user.id, action: 'member.wioaQualification.submit', targetType: 'WioaQualification', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'WioaQualification', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 3. member/dashboard-profile PATCH
errors += not patch(
    "app/api/member/dashboard-profile/route.ts",
    [(
        "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/member/dashboard-profile error:",
        "  auditLog({ actorUserId: user.id, action: 'member.dashboardProfile.update', targetType: 'DashboardProfile', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'DashboardProfile', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 4. member/skill-assessment POST
errors += not patch(
    "app/api/member/skill-assessment/route.ts",
    [(
        "      return NextResponse.json({\n        ok: true,\n        resultId: result.id,\n        savedAt: result.createdAt.toISOString(),\n      });\n    } catch (error) {\n      console.error('[POST /api/member/skill-assessment]', error);",
        "      auditLog({ actorUserId: user.id, action: 'member.skillAssessment.submit', targetType: 'SkillAssessment', targetId: result.id }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'SkillAssessment', id: result.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 5. member/feedback POST
errors += not patch(
    "app/api/member/feedback/route.ts",
    [(
        "      return NextResponse.json({ feedback });\n    } catch (err) {\n      captureApiError(err, { route: 'member/feedback POST' })",
        "      auditLog({ actorUserId: user.id, action: 'member.feedback.submit', targetType: 'MemberFeedback', targetId: feedback.id }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'MemberFeedback', id: feedback.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 6. member/learning-progress POST
errors += not patch(
    "app/api/member/learning-progress/route.ts",
    [(
        "  return NextResponse.json({ progress: record });\n\n  } catch (error) {\n    console.error('/member/learning-progress error:",
        "  auditLog({ actorUserId: user.id, action: 'member.learningProgress.update', targetType: 'LearningProgress', targetId: user.id }).catch(() => {});\n"
        "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'LearningProgress', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 6 patches applied successfully")
