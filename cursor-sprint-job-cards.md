# Cursor Sprint: Job Card Redesign

## Task ID
workforceap-job-card-redesign

## Repository
https://github.com/mabrown040/workforceap-beta

## Goal
Redesign job listings from table view to visual card layout

## Requirements

### Job Card Component
**Visual Design:**
- Company logo (left side, 64x64px, rounded)
- Job title (bold, prominent)
- Company name (secondary text)
- Location badge (icon + text)
- Salary range (if provided)
- Job type badge (Full-time, Part-time, Contract)
- Posted date ("2 days ago")
- Match score badge (if viewing matched jobs)
- "View Details" button

**Card States:**
- Default: White background, subtle border
- Hover: Slight shadow, cursor pointer
- Featured: Highlighted border (for sponsored/priority jobs)
- New: "New" badge (posted within 7 days)

### Card Grid Layout
**Public Job Board:**
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column
- Gap: 24px

**Admin/Employer Views:**
- Same grid but with status badges overlay
- Quick actions dropdown (Edit, Close, View Matches)

### Skeleton Loading
- Show 6 skeleton cards while loading
- Fade in real cards when loaded

### Empty State
- Illustration + "No jobs match your search" message
- "Clear filters" button

### Animations
- Stagger fade-in on load (50ms delay between cards)
- Smooth hover transition (200ms)

## Success Criteria
- [ ] Job cards display all required info
- [ ] Responsive grid (3/2/1 columns)
- [ ] Hover effects work
- [ ] Skeleton loading implemented
- [ ] Empty state designed
- [ ] Works on all pages: /jobs, /admin/jobs, /employer/jobs
