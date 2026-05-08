# Cursor Sprint: Fix Admin Jobs Crash

## Task ID
workforceap-fix-admin-jobs-crash

## Repository
https://github.com/mabrown040/workforceap-beta

## Goal
Fix server-side exception on /admin/jobs page

## Error Details
- Page: /admin/jobs
- Error: "Application error: a server-side exception has occurred"
- Digest: 24364446814

## Investigation Steps
1. Check app/(admin)/admin/jobs/page.tsx for runtime errors
2. Check API routes: /api/admin/jobs/* for database query issues
3. Check for missing environment variables or Prisma connection issues
4. Check for null/undefined data handling

## Fix Requirements
- Identify root cause of crash
- Add proper error handling
- Test /admin/jobs loads successfully
- Ensure job list displays correctly

## Success Criteria
- [ ] /admin/jobs loads without error
- [ ] Job data displays correctly
- [ ] PR created and merged
