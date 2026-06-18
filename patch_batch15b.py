#!/usr/bin/env python3
"""Batch 15b — fix: correct needles (colon in error strings) for the 9 files that
batch15.py missed due to console.error('... error:') vs '... error'."""

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
# 1. admin/blog/[id]/route.ts  PATCH + DELETE
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/blog/[id]/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)

needle = "    return NextResponse.json(post);\n  } catch (error) {\n    console.error('[admin/blog/[id] PATCH] error:',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_blog_post_updated', targetType: 'User', targetId: user.id, metadata: { postId: id } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'BlogPost', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} PATCH needle not found")

needle = "    return NextResponse.json({ ok: true });\n  } catch (error) {\n    console.error('[admin/blog/[id] DELETE] error:',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_blog_post_deleted', targetType: 'User', targetId: user.id, metadata: { postId: id } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'deleted', object: { type: 'BlogPost', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} DELETE needle not found")

with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. admin/counselors/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/counselors/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
# Both GET and POST share the same error string — needle is unique because GET
# returns the counselors array, not { ok: true }
needle = "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/admin/counselors error:',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_counselor_created', targetType: 'User', targetId: userId, metadata: { affiliation: resolvedAffiliation } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'Counselor', id: userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} POST needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. admin/members/[id]/award-points/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/members/[id]/award-points/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, ...result });\n\n  } catch (error) {\n    console.error('/admin/members/[id]/award-points error:',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_points_awarded', targetType: 'User', targetId: memberId, metadata: { points } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'PointsAward', id: memberId }, result: { success: true, extensions: { points } } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. admin/members/[id]/counselor/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/members/[id]/counselor/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({\n    ok: true,\n    counselorName: counselor.user.fullName,\n  });\n\n  } catch (error) {\n    console.error('/admin/members/[id]/counselor error:',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_counselor_assigned', targetType: 'User', targetId: memberId, metadata: { counselorUserId: counselor.userId } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'CounselorAssignment', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. admin/members/[id]/enrollment-funding/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/members/[id]/enrollment-funding/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/admin/members/[id]/enrollment-funding error:',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_enrollment_funding_updated', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'EnrollmentFunding', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 6. admin/members/[id]/send-eligibility-link/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/members/[id]/send-eligibility-link/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ ok: true });\n    } catch (error) {\n      console.error('/admin/members/[id]/send-eligibility-link error:',"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_member_eligibility_link_sent', targetType: 'User', targetId: id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'EligibilityLink', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 7. admin/organization/logo/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
logo_path = "app/api/admin/organization/logo/route.ts"
with open(logo_path) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ ok: true, logo: resolveSupabasePublicAssetUrl(BUCKET, path) });\n  } catch (error) {\n    console.error('[admin/organization/logo] error:',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_org_logo_updated', targetType: 'User', targetId: organizationId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'OrganizationLogo', id: organizationId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {logo_path} needle not found")
with open(logo_path, 'w') as f: f.write(c)
print(f"Patched {logo_path}")

# ──────────────────────────────────────────────────────────────────────────────
# 8. admin/placement-surveys/resend/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/placement-surveys/resend/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ success: true, surveyId, wave });\n  } catch (error) {\n    console.error('/admin/placement-surveys/resend error:',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_placement_survey_resent', targetType: 'User', targetId: placement.userId, metadata: { placementId, surveyId, wave } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'PlacementSurveyResend', id: placement.userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

# ──────────────────────────────────────────────────────────────────────────────
# 9. admin/reports/wioa/generate/route.ts  POST (bare export, no GUC)
# ──────────────────────────────────────────────────────────────────────────────
p = "app/api/admin/reports/wioa/generate/route.ts"
with open(p) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ success: true, report });\n  } catch (error) {\n    console.error('/api/admin/reports/wioa/generate POST error:',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_wioa_report_generated', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'WioaReport', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print(f"WARNING: {p} needle not found")
with open(p, 'w') as f: f.write(c)
print(f"Patched {p}")

print("\nAll batch 15b files patched.")
