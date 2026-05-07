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

---

# Create Employer Record and User – Michael Brown (Techvera)

## Overview

Create an employer record and user for Michael Brown, linking them for employer portal access.

## Details

| Field | Value |
|-------|-------|
| Contact name | Michael Brown |
| Company | Techvera |
| Email | michael.brown@workforceap.org |
| Phone | (512) 777-1808 |

## Steps

1. **Create employer role** – Add `employer` to the `roles` table (in seed).
2. **Create or find user** – If `michael.brown@workforceap.org` exists in the database, use that user. Otherwise create via Supabase Auth and sync to `users` + `profiles`.
3. **Create employer record** – Insert/upsert in `employers` table with `userId`, `companyName`, `contactName`, `contactEmail`, `contactPhone`.
4. **Assign employer role** – Link user to `employer` role via `user_roles`.
5. **Link user and employer** – The `employers.user_id` foreign key links them.

## Implementation

- **Script**: `scripts/create-employer-michael-brown.ts` – Run once to create the employer and user.
- **Run**: `node scripts/prisma-env.js npx tsx scripts/create-employer-michael-brown.ts`
- **Prerequisites**: `POSTGRES_PRISMA_URL` (or `DATABASE_URL`) set. For new users: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Schema References

- `employers` – `user_id` (FK to users.id), `company_name`, `contact_name`, `contact_email`, `contact_phone`
- `users` – `id`, `email`, `full_name`, `phone`
- `user_roles` – `user_id`, `role_id` (role `employer`)
- `roles` – `name` = `employer`

## Verification

- User can log in at `/employer` (employer portal).
- `getEmployerForUser(userId)` returns the Techvera employer record.
- Admin employers page (`/admin/employers`) shows Techvera with Michael Brown.
