#!/usr/bin/env python3
"""Batch 19 audit trail patch — remaining counselor session/feedback routes."""

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
# 1. counselor/feedback/route.ts  POST (inline withApiGuc, actor=user)
#    AI coach feedback session — saves transcript, awards points
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/feedback/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ steps });\n    } catch (err) {\n      console.error('Career counselor feedback persistence error:', err);"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'counselor_feedback_session_saved', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'CounselorFeedbackSession', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. counselor/sessions/email-packet/route.ts  POST (inline withApiGuc, actor=user)
#    Sends career readiness email packet to member; updates onboarding records
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/sessions/email-packet/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ ok: true, sectionCount: sections.length, to: member.email });\n  } catch (error) {\n    console.error('/counselor/sessions/email-packet:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'counselor_email_packet_sent', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'EmailPacket', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. counselor/sessions/voice-walkthrough/route.ts  POST (withApiGuc named fn)
#    Starts an ElevenLabs voice session for a member on behalf of counselor
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/counselor/sessions/voice-walkthrough/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({\n      signedUrl: session.signedUrl,\n      expiresAt: session.expiresAt,\n      dynamicVariables: session.dynamicVariables ?? dynamicVariables,\n    });\n  } catch (error) {\n    captureApiError(error, { route: 'POST /api/counselor/sessions/voice-walkthrough' });"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'counselor_voice_walkthrough_started', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'VoiceWalkthroughSession', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

print("\nAll batch 19 files patched.")
