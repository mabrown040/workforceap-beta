# Cursor Sprint: Job Approval Workflow

## Task ID
workforceap-job-approval-workflow

## Repository
https://github.com/mabrown040/workforceap-beta

## Goal
Build complete job approval workflow: Employer submits → Admin reviews → Approve/Reject → Goes live on student site

## Requirements

### Workflow States
```
Draft (employer editing)
  ↓ Submit
Pending (awaiting admin review)
  ↓ Admin approves
Live (visible on /jobs)
  ↓ Employer closes / Admin removes
Closed (no longer visible)
```

### Employer Side
- Submit job for review button (moves from Draft → Pending)
- View job status (Draft/Pending/Live/Closed)
- Edit job while in Draft state only
- Close own job listing

### Admin Side  
- Jobs pending review queue (/admin/jobs/pending)
- Review page with job details + approve/reject buttons
- Rejection reason field (sent to employer)
- Bulk actions (approve multiple, reject multiple)
- Email notifications on status changes

### Database
- Add `status` enum to jobs table: draft, pending, live, closed, rejected
- Add `reviewed_at`, `reviewed_by_id`, `rejection_reason` fields

### API Endpoints
- POST /api/employer/jobs/[id]/submit
- POST /api/admin/jobs/[id]/approve
- POST /api/admin/jobs/[id]/reject
- GET /api/admin/jobs/pending

### Email Notifications
- Employer: "Job submitted for review"
- Employer: "Job approved and live"
- Employer: "Job rejected" (with reason)
- Admin: "New job pending review"

## Success Criteria
- [ ] Employer can submit job for approval
- [ ] Admin sees pending jobs queue
- [ ] Admin can approve/reject with optional reason
- [ ] Approved jobs appear on /jobs (student site)
- [ ] Rejected jobs show reason to employer
- [ ] All status changes trigger email notifications
