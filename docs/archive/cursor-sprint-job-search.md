# Cursor Sprint: Job Search & Filter

## Task ID
workforceap-job-search-filter

## Repository
https://github.com/mabrown040/workforceap-beta

## Goal
Add search and filter functionality to job board for students and employers

## Requirements

### Public Job Board (/jobs)
**Search Bar:**
- Full-text search across job title, description, requirements
- Debounced input (300ms)

**Filters:**
- Program (dropdown: All Programs, IT Support, Digital Literacy, etc.)
- Location (dropdown: All Locations, Austin TX, Remote, Hybrid)
- Job Type (checkboxes: Full-time, Part-time, Contract)
- Salary Range (min/max inputs or slider)
- Employer (multi-select dropdown)

**Sort Options:**
- Newest first (default)
- Salary: High to Low
- Salary: Low to High
- Alphabetical (A-Z)

**Results:**
- Show count: "Showing X of Y jobs"
- Infinite scroll or pagination
- Clear all filters button
- URL sync (filters in query params for shareable links)

### Admin Job List (/admin/jobs)
- Same filters as public
- Additional filters:
  - Status (draft, pending, live, closed, rejected)
  - Employer (dropdown)
- Bulk actions with filtered selection

### API Endpoints
- GET /api/jobs/search?q=keyword&program=&location=&type=&minSalary=&maxSalary=
- Support pagination: page, limit params
- Return filtered count + total count

### Performance
- Database indexes on: status, program_id, location, salary_range
- Search using full-text search or ILIKE with trigram index

## Success Criteria
- [ ] Student can search jobs by keyword
- [ ] All filters work individually and combined
- [ ] URL updates with filters (shareable)
- [ ] Results update in real-time (no page reload)
- [ ] Mobile-friendly filter UI (collapsible)
