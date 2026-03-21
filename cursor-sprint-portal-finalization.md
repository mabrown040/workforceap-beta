# Cursor Sprint: Portal System Finalization & Revenue Workflows

## Task ID
workforceap-portal-system-finalization

## Repository
https://github.com/mabrown040/workforceap-beta
Branch: cursor/portal-system-development-5cb9 (or main if merged)

## Goal
End-to-end validation and polish of all revenue-critical workflows. Each portal must work independently AND as an integrated system.

## Revenue Streams to Validate

### Stream 1: Employer Portal ($$ from job postings)
**Workflow:** Employer signup → Create jobs → Submit for approval → Go live → Match to students

**Test & Fix:**
- [ ] Employer self-signup via /employers contact form (email to michael.brown@workforceap.org)
- [ ] Admin converts inquiry → employer account (Create employer portal account flow)
- [ ] Employer logs in, sees dashboard with stats
- [ ] Employer creates single job draft (form validation, save as draft)
- [ ] Employer bulk imports jobs (up to 15 URLs, handles paste fallback)
- [ ] Drafts show in "My Jobs" with Submit for review button
- [ ] Submit changes status to pending
- [ ] Admin approves → status live
- [ ] Live jobs appear on /jobs (public)
- [ ] AI matches populate for live jobs (GET /api/admin/jobs/[id]/matches)

**Edge Cases:**
- [ ] LinkedIn/ATS blocks fetch → graceful paste fallback with clear messaging
- [ ] Draft validation fails → helpful error messages
- [ ] Employer with no jobs → empty state CTA
- [ ] Super admin "Open portal" sets cookie, shows banner, can clear
- [ ] Super admin steps out → returns to admin cleanly

### Stream 2: Partner Portal ($$ from referrals)
**Workflow:** Partner refers student → Tracks progress → Gets credit on placement

**Test & Fix:**
- [ ] Partner signup (existing flow still works)
- [ ] /partner/guide loads with referral instructions
- [ ] /partner/resources loads with links + partner contact
- [ ] Partner sees referred members list with progress
- [ ] Partner sees dashboard stats (referrals, active, completions)
- [ ] Super admin can view partner portal (view switcher)

**Edge Cases:**
- [ ] Partner with no referrals → empty state
- [ ] Member status updates in real-time (or on refresh)

### Stream 3: Student Portal ($$ from program enrollment/placement)
**Workflow:** Student applies → Gets accepted → Trains → Assessed → Matched to jobs → Placed

**Test & Fix:**
- [ ] Student application flow works end-to-end
- [ ] Student sees training progress
- [ ] Student sees assessment results (where do they go?)
- [ ] Student sees matched jobs (AI recommendations)
- [ ] Student can view /jobs and apply

**Missing Critical:**
- [ ] BUILD: /dashboard/assessments page (show assessment history/results)
- [ ] BUILD: Student job recommendations (where do matches show for student?)

### Stream 4: Admin Portal (Operations & Revenue Oversight)
**Workflow:** Admin manages all entities, approves content, monitors metrics

**Test & Fix:**
- [ ] /admin/jobs loads without crash (verify post-merge)
- [ ] /admin/jobs/pending loads (approval queue)
- [ ] Admin can approve/reject jobs with feedback
- [ ] /admin/employers shows all employers
- [ ] Create employer account flow works (search member → create)
- [ ] Open portal cookie sets correctly
- [ ] View switcher shows all 4 options (Admin/Partner/Student/Employer)
- [ ] Super admin can access all portals without login loops

**Fix if Broken:**
- [ ] Any 500 errors → add error boundaries
- [ ] Any 404 routes → create placeholder pages with "Coming soon" if needed

## Integration Tests (Critical)

### Test 1: Full Employer Lifecycle
1. Create employer via admin (Techvera / michael.brown@workforceap.org)
2. Login as employer
3. Create 3 job drafts (2 single, 1 bulk import)
4. Submit all for review
5. Switch to admin, approve 2, reject 1
6. Verify approved jobs on /jobs
7. Run AI match on approved job
8. Verify matches show candidates
9. Send "Suggest matches" email

### Test 2: Super Admin Portal Hopping
1. Login as super admin
2. Switch to Student → browse 3 pages
3. Switch to Partner → browse 2 pages  
4. Switch to Employer → verify cookie banner shows
5. Clear cookie, back to Admin
6. Use "Open portal" from /admin/employers
7. Verify employer context works
8. Clear cookie, return to admin

### Test 3: Partner Referral Flow
1. Login as partner
2. Note referral URL/code
3. New student applies with referral
4. Verify partner sees student in dashboard
5. Admin moves student to "enrolled"
6. Verify partner sees updated status

## Data Integrity Checks

- [ ] Job statuses flow correctly: draft → pending → live/rejected → closed
- [ ] Employer can only see THEIR jobs
- [ ] Partner can only see THEIR referrals
- [ ] Super admin sees all
- [ ] AI matches cache correctly (job_candidate_matches table)
- [ ] Email notifications fire at right times (create, submit, approve, reject)

## Mobile & Responsive

- [ ] Employer portal usable on mobile (375px)
- [ ] Partner portal usable on mobile
- [ ] Bulk import works on mobile (or shows "desktop recommended")
- [ ] No horizontal scroll on tables (or has scroll container)

## SaaS Prep (Documentation)

Create BRIEF notes on:
- [ ] How to onboard a new employer (steps)
- [ ] How to onboard a new partner (steps)
- [ ] How job matching works (data flow)
- [ ] What each portal sees/does (permissions matrix)

## Success Criteria

All checkboxes above = ✅
No 500 errors
No 404s on critical paths
All revenue streams functional end-to-end
Super admin can seamlessly hop portals
Mobile usable

## Deliverable
Working system + brief SaaS onboarding notes + PR merged
