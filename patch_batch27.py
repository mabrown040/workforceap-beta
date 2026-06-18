#!/usr/bin/env python3
"""Batch 27: notifications (dismiss-all, read-all, [id]/read, [id] delete) + messages"""

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

# 1. member/notifications/dismiss-all POST
errors += not patch(
    "app/api/member/notifications/dismiss-all/route.ts",
    [(
        "    return NextResponse.json({\n      ok: true,\n      updatedCount: result.count,\n      unreadCount,\n    });\n  } catch (error) {\n    console.error('/member/notifications/dismiss-all error:",
        "    auditLog({ actorUserId: user.id, action: 'member.notifications.dismissAll', targetType: 'NotificationBatch', targetId: user.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'NotificationBatch', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 2. member/notifications/read-all POST
errors += not patch(
    "app/api/member/notifications/read-all/route.ts",
    [(
        "    return NextResponse.json({\n      ok: true,\n      updatedCount: result.count,\n      unreadCount,\n    });\n  } catch (error) {\n    console.error('/member/notifications/read-all error:",
        "    auditLog({ actorUserId: user.id, action: 'member.notifications.readAll', targetType: 'NotificationBatch', targetId: user.id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'NotificationBatch', id: user.id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 3. member/notifications/[id]/read PUT+PATCH
errors += not patch(
    "app/api/member/notifications/[id]/read/route.ts",
    [(
        "    return NextResponse.json({\n      ok: true,\n      notification: {\n        id: updated.id,",
        "    auditLog({ actorUserId: user.id, action: 'member.notification.read', targetType: 'Notification', targetId: id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Notification', id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 4. member/notifications/[id] DELETE
errors += not patch(
    "app/api/member/notifications/[id]/route.ts",
    [(
        "    return NextResponse.json({ ok: true });\n  } catch (error) {\n    console.error('/member/notifications/[id] delete error:",
        "    auditLog({ actorUserId: user.id, action: 'member.notification.delete', targetType: 'Notification', targetId: id }).catch(() => {});\n"
        "    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'delete', object: { type: 'Notification', id }, result: { success: true } }).catch(() => {});\n",
    )],
)

# 5. member/messages POST (send message)
# 6. member/messages PATCH (mark thread read)
errors += not patch(
    "app/api/member/messages/route.ts",
    [
        (
            "  return NextResponse.json({ message: serializeMessage(msg) });\n\n  } catch (error) {\n    console.error('/member/messages error:",
            "  auditLog({ actorUserId: user.id, action: 'member.message.send', targetType: 'Message', targetId: msg.id }).catch(() => {});\n"
            "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'Message', id: msg.id }, result: { success: true } }).catch(() => {});\n",
        ),
        (
            "  return NextResponse.json({ ok: true, memberLastReadAt: now.toISOString() });\n\n  } catch (error) {\n    console.error('/member/messages error:",
            "  auditLog({ actorUserId: user.id, action: 'member.messages.markRead', targetType: 'MessageThread', targetId: thread.id }).catch(() => {});\n"
            "  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'MessageThread', id: thread.id }, result: { success: true } }).catch(() => {});\n",
        ),
    ],
)

if errors:
    print(f"\n{errors} file(s) failed")
    sys.exit(1)
else:
    print("\nAll 6 patches applied successfully")
