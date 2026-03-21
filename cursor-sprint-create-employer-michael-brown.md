# Cursor Sprint: Create Employer Record for Michael Brown

## Task ID
workforceap-create-employer-michael-brown

## Repository
https://github.com/mabrown040/workforceap-beta

## Goal
Create employer record and user account for Michael Brown (dad)

## Details
- Name: Michael Brown
- Email: michael.brown@workforceap.org
- Company: Techvera
- Phone: (512) 777-1808

## Implementation
1. Create employer record in database via Prisma
2. Create user account with employer role
3. Link user to employer record
4. Invite user via Supabase Auth

## Files
- Update prisma/seed.ts OR create migration
- OR use admin API to create employer

## Alternative: Admin API Route
Create POST /api/admin/employers/seed for admin to create employers

## Success Criteria
- [ ] Employer record exists for Techvera
- [ ] User michael.brown@workforceap.org created
- [ ] User has employer role
- [ ] User can login and access employer portal
- [ ] PR created and merged
