#!/usr/bin/env python3
"""Batch 15 audit trail patch — member mgmt, blog, counselors, org settings."""

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
# 1. admin/blog/[id]/route.ts  PATCH + DELETE (bare export functions, no GUC)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/blog/[id]/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)

# PATCH — needle includes error message suffix to distinguish from GET
needle = "    return NextResponse.json(post);\n  } catch (error) {\n    console.error('[admin/blog/[id] PATCH] error',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_blog_post_updated', targetType: 'User', targetId: user.id, metadata: { postId: id } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'BlogPost', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: blog/[id] PATCH needle not found")

# DELETE — needle includes error suffix to distinguish from other returns
needle = "    return NextResponse.json({ ok: true });\n  } catch (error) {\n    console.error('[admin/blog/[id] DELETE] error',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_blog_post_deleted', targetType: 'User', targetId: user.id, metadata: { postId: id } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'deleted', object: { type: 'BlogPost', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: blog/[id] DELETE needle not found")

with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. admin/counselors/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/counselors/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/admin/counselors error',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_counselor_created', targetType: 'User', targetId: userId, metadata: { affiliation: resolvedAffiliation } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'Counselor', id: userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: counselors POST needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. admin/members/[id]/award-points/route.ts  POST
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/award-points/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true, ...result });\n\n  } catch (error) {\n    console.error('/admin/members/[id]/award-points error',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_points_awarded', targetType: 'User', targetId: memberId, metadata: { points } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'PointsAward', id: memberId }, result: { success: true, extensions: { points } } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: award-points needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. admin/members/[id]/counselor/route.ts  POST (inline withApiGuc)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/counselor/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({\n    ok: true,\n    counselorName: counselor.user.fullName,\n  });\n\n  } catch (error) {\n    console.error('/admin/members/[id]/counselor error',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_counselor_assigned', targetType: 'User', targetId: memberId, metadata: { counselorUserId: counselor.userId } }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'CounselorAssignment', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: member counselor POST needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. admin/members/[id]/edit-profile/route.ts  PATCH (inline; actor = admin)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/edit-profile/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
# Actor variable is `admin` (not `user`) in this file
needle = "      return NextResponse.json({ success: true, user });"
insertion = (
    "      void auditLog({ actorUserId: admin.id, action: 'admin_member_profile_edited', targetType: 'User', targetId: id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: admin.id, role: 'admin' }, verb: 'updated', object: { type: 'MemberProfile', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: edit-profile PATCH needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 6. admin/members/[id]/enrollment-funding/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/enrollment-funding/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "  return NextResponse.json({ ok: true });\n\n  } catch (error) {\n    console.error('/admin/members/[id]/enrollment-funding error',"
insertion = (
    "  void auditLog({ actorUserId: user.id, action: 'admin_member_enrollment_funding_updated', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'EnrollmentFunding', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: enrollment-funding needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 7. admin/members/[id]/partner/route.ts  PATCH (inline, two success returns)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/partner/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)

# Clear path (8-space indent inside if(!partnerId))
needle = "        return NextResponse.json({ ok: true });\n      }"
insertion = (
    "        void auditLog({ actorUserId: user.id, action: 'admin_member_partner_cleared', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});\n"
    "        logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'deleted', object: { type: 'MemberPartnerAssignment', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: partner PATCH clear needle not found")

# Assign path (6-space indent, followed by catch(e))
needle = "      return NextResponse.json({ ok: true });\n    } catch (e) {"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_member_partner_assigned', targetType: 'User', targetId: memberId, metadata: { partnerId } }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'MemberPartnerAssignment', id: memberId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: partner PATCH assign needle not found")

with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 8. admin/members/[id]/send-eligibility-link/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/members/[id]/send-eligibility-link/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "      return NextResponse.json({ ok: true });\n    } catch (error) {\n      console.error('/admin/members/[id]/send-eligibility-link error',"
insertion = (
    "      void auditLog({ actorUserId: user.id, action: 'admin_member_eligibility_link_sent', targetType: 'User', targetId: id, metadata: {} }).catch(() => {});\n"
    "      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'EligibilityLink', id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: send-eligibility-link needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 9. admin/settings/organization/route.ts  PATCH
#    Special: both GET and PATCH return the same JSON, distinguishable by
#    blank line before return in PATCH (GET has if(!org) check before return)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/settings/organization/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
# GET has: }));\n  if (!org) return ...\n  return NextResponse.json({
# PATCH has: }));\n\n  return NextResponse.json({    ← blank line is unique
old = "  }));\n\n  return NextResponse.json({\n    ...org,\n    logo: resolveSupabasePublicAssetUrl('organization-branding', org.logo),\n  });"
new = (
    "  }));\n\n"
    "  void auditLog({ actorUserId: user.id, action: 'admin_org_settings_updated', targetType: 'User', targetId: organizationId, metadata: {} }).catch(() => {});\n"
    "  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'OrganizationSettings', id: organizationId }, result: { success: true } }).catch(() => {});\n"
    "  return NextResponse.json({\n    ...org,\n    logo: resolveSupabasePublicAssetUrl('organization-branding', org.logo),\n  });"
)
count = c.count(old)
if count != 1:
    print(f"WARNING: org-settings PATCH needle found {count} times (expected 1)")
else:
    c = c.replace(old, new)
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 10. admin/organization/logo/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/organization/logo/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ ok: true, logo: resolveSupabasePublicAssetUrl(BUCKET, path) });\n  } catch (error) {\n    console.error('[admin/organization/logo] error',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_org_logo_updated', targetType: 'User', targetId: organizationId, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'updated', object: { type: 'OrganizationLogo', id: organizationId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: org logo POST needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 11. admin/placement-surveys/resend/route.ts  POST (inline)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/placement-surveys/resend/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ success: true, surveyId, wave });\n  } catch (error) {\n    console.error('/admin/placement-surveys/resend error',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_placement_survey_resent', targetType: 'User', targetId: placement.userId, metadata: { placementId, surveyId, wave } }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'PlacementSurveyResend', id: placement.userId }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: placement-surveys/resend needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

# ──────────────────────────────────────────────────────────────────────────────
# 12. admin/reports/wioa/generate/route.ts  POST (bare export, no GUC)
# ──────────────────────────────────────────────────────────────────────────────
path = "app/api/admin/reports/wioa/generate/route.ts"
with open(path) as f: c = f.read()
c = prepend_imports(c)
needle = "    return NextResponse.json({ success: true, report });\n  } catch (error) {\n    console.error('/api/admin/reports/wioa/generate POST error',"
insertion = (
    "    void auditLog({ actorUserId: user.id, action: 'admin_wioa_report_generated', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});\n"
    "    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'WioaReport', id: user.id }, result: { success: true } }).catch(() => {});\n"
)
c, ok = insert_before(c, needle, insertion)
if not ok: print("WARNING: wioa/generate POST needle not found")
with open(path, 'w') as f: f.write(c)
print(f"Patched {path}")

print("\nAll batch 15 files patched.")
