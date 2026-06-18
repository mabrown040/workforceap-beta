#!/usr/bin/env python3
"""Batch 17 audit trail patch — email templates, upload-resume, blog AI create routes."""

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
# 1. admin/email-templates/[id]/route.ts  PATCH (withApiGuc named fn, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/email-templates/[id]/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json(template);\n  } catch (error) {\n    console.error('/admin/email-templates/[id] PATCH error:', error);"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_email_template_updated', targetType: 'EmailTemplate', targetId: id, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'EmailTemplate', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. admin/members/[id]/upload-resume/route.ts  POST (inline withApiGuc, actor=user)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/members/[id]/upload-resume/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, originalPath, enhancedPath });"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_resume_uploaded', targetType: 'User', targetId: userId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'MemberResume', id: userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. admin/blog/ai/draft/route.ts  POST (inline withApiGuc, actor=user)
#    Creates a blog post → audit the creation
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/blog/ai/draft/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ post: { id: post.id, slug: post.slug } });\n    } catch (err) {\n      console.error('Blog AI draft error:', err);"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_blog_draft_created', targetType: 'BlogPost', targetId: post.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'BlogPost', id: post.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. admin/blog/ai/from-ideas/route.ts  POST (inline withApiGuc, actor=user)
#    Only the draft-creation path (mode==='draft') mutates — audit that path only
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/blog/ai/from-ideas/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ post: { id: post.id, slug: post.slug } });\n    } catch (err) {\n      console.error('Blog from-ideas draft error:', err);"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_blog_draft_created', targetType: 'BlogPost', targetId: post.id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'BlogPost', id: post.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

print("\nAll batch 17 files patched.")
