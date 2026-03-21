# Cursor Sprint: Employer Data Seeding & E2E Job Testing

## Task ID
workforceap-employer-data-seed

## Repository
https://github.com/mabrown040/workforceap-beta

## Base Branch
main

## Goal
Seed test employer data and enable full job posting workflow testing. Add Employer view to super admin view switcher.

---

## Issue Summary (from QA Audit)

**Critical Blockers Found:**
1. **Empty Employer Table** — /admin/employers shows "No employers yet"
2. **Empty Jobs Board** — /jobs shows "No jobs available at the moment"
3. **Empty Jobs Admin** — /admin/jobs shows "No jobs yet"
4. **Missing Employer View** — Super admin view switcher lacks Employer Portal option

**Root Cause:** No employer records exist in database. Job posting workflow cannot be tested without employers.

---

## Requirements

### 1. Seed Test Employer Data
Create 3-5 test employer records via database seed script or API:

**Required Fields per Employer:**
- `id` (UUID)
- `name` (company name)
- `email` (contact email)
- `phone` (optional)
- `website` (optional)
- `description` (company description)
- `logo_url` (optional, can be null)
- `status` (active/pending)
- `created_at`, `updated_at` timestamps

**Sample Employers to Create:**
1. **TechVera** — michael@techvera.com — IT Services company in Austin
2. **Austin Tech Partners** — hiring@austintechpartners.com — Local tech recruiting
3. **Workforce Solutions** — info@wfscapitalarea.com — Non-profit partner
4. **CapMetro** — jobs@capmetro.org — Transportation authority
5. **Dell Technologies** — austinjobs@dell.com — Major employer

### 2. Create Sample Job Listings
Create 3-5 sample job postings across different programs:

**Required Fields per Job:**
- `id` (UUID)
- `employer_id` (reference to seeded employer)
- `title` (job title)
- `description` (full description)
- `requirements` (qualifications)
- `location` (Austin, TX or Remote)
- `salary_range` (optional)
- `job_type` (full-time, part-time, contract)
- `status` (pending/approved/live/closed)
- `program_id` (which program this aligns with)
- `created_at`, `updated_at` timestamps

**Sample Jobs:**
1. **IT Support Specialist** — TechVera — Full-time — $45k-55k — Aligns with IT Support program
2. **Help Desk Technician** — Austin Tech Partners — Full-time — $40k-50k — Digital Literacy pathway
3. **Data Entry Clerk** — Workforce Solutions — Part-time — $18/hr — Office Admin program
4. **Customer Service Rep** — CapMetro — Full-time — $38k-42k — Customer Success program
5. **Junior Web Developer** — Dell — Full-time — $65k-75k — AI Professional Developer program

### 3. Add Employer View to Super Admin Switcher
**Location:** Header component with view switcher dropdown

**Current Options:**
- Admin Portal
- Partner Portal  
- Student Portal

**Add:**
- Employer Portal

**Implementation:**
- Check if user has `super_admin` or `admin` role
- Add "Employer Portal" option to dropdown
- Navigate to `/employer` when selected
- Maintain current view in session state

### 4. Update Documentation
Create `EMPLOYER-SEED-DATA.md` documenting:
- What employers were seeded
- What jobs were created
- How to add more test data
- API endpoints for programmatic access

---

## Technical Notes

**Database Tables:**
- `employers` — Company information
- `jobs` — Job postings
- `job_applications` — Member applications to jobs

**File Locations:**
- Employer/Job types: `lib/database.types.ts` or similar
- Database seed: `scripts/seed-employers.ts` or similar
- View switcher: `components/layout/DashboardHeader.tsx` or similar

**Existing Active Agent:**
- `bc-f75f7f81-db88-4872-b356-9b6b71294b20` — Building employer portal + job management
- Coordinate with this agent's work — don't duplicate job posting UI

---

## Success Criteria

- [ ] /admin/employers shows 3-5 employer records
- [ ] /admin/jobs shows 3-5 job listings
- [ ] /jobs (public) shows approved job listings
- [ ] Super admin view switcher includes "Employer Portal" option
- [ ] View switcher navigates to /employer correctly
- [ ] EMPLOYER-SEED-DATA.md created with documentation

---

## QA Test Plan

After implementation, test:
1. Navigate to /admin/employers → verify employers list
2. Navigate to /admin/jobs → verify jobs list with employer names
3. Navigate to /jobs → verify public job board shows listings
4. Click into a job → verify details display
5. Use view switcher → select Employer Portal → verify navigation to /employer
6. Return to Admin view → verify switch back works

---

**Note:** Focus on DATA SEEDING and VIEW SWITCHER. The employer portal UI is being built by a separate agent. Ensure compatibility with their work.
