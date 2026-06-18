#!/usr/bin/env python3
"""Batch 28: resume (upload, plain-text, generate), linkedin-enrich, voice-interview/transcript"""

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

# 1. member/resume/upload POST
errors += not patch(
    "app/api/member/resume/upload/route.ts",
    [(
        "    return NextResponse.json({ ok: true, path });\n  } catch (e) {\n    console.error('Resume upload route error:', e);",
        "    auditLog({ actorUserId: user.id, action: 'member.resume.upload', targetType: 'Resume', targetId: user.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'Resume', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/resume/plain-text POST
errors += not patch(
    "app/api/member/resume/plain-text/route.ts",
    [(
        "    return NextResponse.json({ ok: true, path });\n  } catch (e) {\n    console.error('[member/resume/plain-text] error:",
        "    auditLog({ actorUserId: user.id, action: 'member.resume.savePlainText', targetType: 'Resume', targetId: user.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Resume', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 3. member/resume/generate POST — primary path
# 4. member/resume/generate POST — fallback path
errors += not patch(
    "app/api/member/resume/generate/route.ts",
    [
        (
            "      return NextResponse.json({ ok: true, resume: cleanedOutput, path, fallbackUsed });\n    } catch (err) {\n      console.error('Generate resume error:', err);",
            "      auditLog({ actorUserId: user.id, action: 'member.resume.generate', targetType: 'Resume', targetId: user.id }).catch(() => {});\n"
            "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Resume', id: user.id }, result: { success: true } }).catch(() => {});\n",
        ),
        (
            "        return NextResponse.json({ ok: true, resume: output, path, fallbackUsed: true });\n      } catch (fallbackErr) {\n        console.error('Generate resume fallback error:', fallbackErr);",
            "        auditLog({ actorUserId: user.id, action: 'member.resume.generate', targetType: 'Resume', targetId: user.id, metadata: { fallback: true } }).catch(() => {});\n"
            "        logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Resume', id: user.id }, result: { success: true } }).catch(() => {});\n",
        ),
    ],
)

# 5. member/linkedin-enrich POST — cached path
# 6. member/linkedin-enrich POST — proxycurl path
# 7. member/linkedin-enrich POST — manual-only (no proxycurl key) path
errors += not patch(
    "app/api/member/linkedin-enrich/route.ts",
    [
        (
            "          return NextResponse.json({\n            success: true,\n            source: 'cached',",
            "          auditLog({ actorUserId: user.id, action: 'member.linkedinEnrich.cached', targetType: 'LinkedInEnrichment', targetId: user.id }).catch(() => {});\n"
            "          logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'LinkedInEnrichment', id: user.id }, result: { success: true } }).catch(() => {});\n",
        ),
        (
            "        return NextResponse.json({\n          success: true,\n          source: 'proxycurl',",
            "        auditLog({ actorUserId: user.id, action: 'member.linkedinEnrich.proxycurl', targetType: 'LinkedInEnrichment', targetId: user.id }).catch(() => {});\n"
            "        logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'LinkedInEnrichment', id: user.id }, result: { success: true } }).catch(() => {});\n",
        ),
        (
            "    return NextResponse.json({\n      success: true,\n      source: 'manual_only',",
            "    auditLog({ actorUserId: user.id, action: 'member.linkedinEnrich.manualUrl', targetType: 'LinkedInEnrichment', targetId: user.id }).catch(() => {});\n"
            "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'LinkedInEnrichment', id: user.id }, result: { success: true } }).catch(() => {});\n",
        ),
    ],
)

# 8. member/voice-interview/transcript POST (actual mutation path; skip the skipped: true early return)
errors += not patch(
    "app/api/member/voice-interview/transcript/route.ts",
    [(
        "      return NextResponse.json({ ok: true });\n    } catch (error) {\n      console.error('[voice-interview transcript] failed', error);",
        "      auditLog({ actorUserId: user.id, action: 'member.voiceInterview.transcriptSaved', targetType: 'VoiceInterviewTranscript', targetId: user.id }).catch(() => {});\n"
        "      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'VoiceInterviewTranscript', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 8 patches applied successfully")
