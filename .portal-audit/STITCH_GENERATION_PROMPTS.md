# Stitch Design Generation Prompts
## WorkforceAP Portal - Missing Designs

---

## 🔴 PRIORITY 1: Navigation Blockers

### 1. Member Job Applications (Desktop + Mobile)
```
Create a Kanban-style job application tracker for WorkforceAP member portal.

FEATURES TO INCLUDE:
- 4 columns: Applied, Phone Screen, Interviewing, Offer
- Cards show: Company logo placeholder, Job title, Company name, Date applied, Status badge
- Empty states for each column
- "Add Application" floating button
- Mobile: Horizontal scrollable columns or stacked view

DESIGN TOKENS:
- Primary: #8c0f37 (WorkforceAP red)
- Surface: #fcf9f8 (light), #121416 (dark)
- Success green for offer stage
- Warning amber for interviewing
- Cards: rounded-xl, surface-container-low

LAYOUT:
- Desktop: 4-column horizontal Kanban
- Mobile: Single column with horizontal scroll or accordion

ICONS: Material Symbols - work, schedule, phone, checklist, stars
```

### 2. Member Training (Desktop + Mobile)
```
Create a training/courses page for WorkforceAP member portal.

FEATURES TO INCLUDE:
- Course cards with: Thumbnail, Title, Provider (Coursera), Progress bar, Status (In Progress/Completed/Not Started)
- Filter tabs: All, In Progress, Completed, Recommended
- "Continue Learning" CTA for in-progress courses
- Certificate download for completed courses
- Search bar

DESIGN TOKENS:
- Progress bar: primary-container fill
- Completed: green accent
- In Progress: primary accent
- Card hover: surface-container-high

LAYOUT:
- Desktop: 3-column grid
- Mobile: Single column stack

ICONS: menu_book, school, play_circle, download, schedule
```

### 3. Member Mentors (Desktop + Mobile)
```
Create a mentor directory page for WorkforceAP member portal.

FEATURES TO INCLUDE:
- Mentor cards: Photo, Name, Title, Company, Expertise tags, "Request Session" button
- Filter: By expertise area (AI, Cybersecurity, Cloud, etc.)
- Search by name or company
- "My Sessions" tab for upcoming/past
- Availability indicator

DESIGN TOKENS:
- Cards: surface-container-low, rounded-xl
- Expertise tags: secondary-container background
- Available badge: green dot

LAYOUT:
- Desktop: 2-column grid
- Mobile: Single column

ICONS: person, calendar_today, videocam, send
```

### 4. Member Counselor (Desktop + Mobile)
```
Create a "My Counselor" connection page for WorkforceAP member portal.

FEATURES TO INCLUDE:
- Counselor profile card: Photo, Name, Title, Contact info
- "Schedule Session" button
- Recent messages preview (last 3)
- Upcoming appointments list
- Resources shared by counselor
- Quick action: Message, Call, Schedule

DESIGN TOKENS:
- Hero section with counselor photo
- Primary CTA button
- Message preview cards

LAYOUT:
- Desktop: 2-column (profile | activity)
- Mobile: Stacked

ICONS: person, chat, calendar_today, phone, videocam
```

### 5. Employer Work Queue (Desktop + Mobile)
```
Create a task/work queue page for WorkforceAP employer portal.

FEATURES TO INCLUDE:
- Task list with: Priority badge, Task name, Due date, Status, Action button
- Filter: All, High Priority, Due Today, Completed
- Task types: Review Application, Schedule Interview, Send Offer, Review Match
- Swipe actions on mobile (Complete, Snooze)
- Empty state

DESIGN TOKENS:
- High priority: error-container
- Medium: secondary-container
- Low: surface-container
- Completed: opacity-50

LAYOUT:
- Desktop: Table view with columns
- Mobile: Card list with swipe

ICONS: inbox, priority_high, check_circle, schedule, swipe
```

### 6. Employer Settings (Desktop + Mobile)
```
Create company settings page for WorkforceAP employer portal.

FEATURES TO INCLUDE:
- Company profile: Logo upload, Name, Industry, Size, Location
- Contact information
- Notification preferences
- Team management (add/remove users)
- Billing/subscription info placeholder
- Integrations placeholder

DESIGN TOKENS:
- Form inputs: surface-container-high
- Section dividers
- Avatar upload with placeholder

LAYOUT:
- Desktop: Sidebar nav + content area
- Mobile: Stacked sections

ICONS: business, people, notifications, credit_card, link
```

### 7. Counselor Mobile Suite
```
Create full mobile versions for Counselor portal:

A) Students List Mobile:
- Search bar
- Filter chips: All, On Track, At Risk, New
- Student cards: Avatar, Name, Program, Progress bar, Status badge
- Quick actions: Message, View Profile

B) Student Detail Mobile:
- Student header: Photo, Name, Program, Status
- Progress section: Overall %, Module breakdown
- Recent activity timeline
- Message thread preview
- "Schedule Session" sticky button

C) Messages Mobile:
- Thread list (same as member messages)
- Conversation view
- Quick reply suggestions

DESIGN TOKENS:
- At Risk: error color
- On Track: green
- Progress bars: primary-container
- Sticky CTA button

ICONS: group, person, chat, calendar_add_on, trending_up, warning
```

---

## 🟡 PRIORITY 2: Mobile Completion

### 8. Member Profile Mobile
```
Mobile version of member profile page.

SECTIONS:
- Profile photo header with edit button
- Personal info (name, email, phone)
- Program enrollment card
- Skills/interests tags
- Assessment scores
- Resume/CV section
- Account settings link

INTERACTION:
- Pull to refresh
- Edit mode toggle
- Photo upload

ICONS: person, edit, photo_camera, badge, stars
```

### 9. Member Program Mobile
```
Mobile version of program details page.

SECTIONS:
- Program hero: Name, Status, Progress ring
- Curriculum accordion: Modules with checkmarks
- Upcoming deadlines
- Counselor card
- Cohort peers (if applicable)
- Resources section

INTERACTION:
- Accordion expand/collapse
- Progress ring animation

ICONS: school, checklist, calendar, person, group, folder
```

### 10. Member Learning Mobile
```
Mobile version of learning hub.

SECTIONS:
- Continue learning card (hero)
- Course categories
- My courses list
- Recommended courses
- Certificate gallery

INTERACTION:
- Horizontal scroll categories
- Course card tap

ICONS: play_circle, menu_book, school, emoji_events
```

### 11. Member Career Brief Mobile
```
Mobile version of AI-generated career brief.

SECTIONS:
- Summary card with gradient
- Job market stats
- Salary range visualization
- Recommended skills
- Top companies list
- Career path timeline

DESIGN:
- Data viz: simple bar charts
- Gradient hero

ICONS: analytics, trending_up, attach_money, business, route
```

### 12. Employer Dashboard Mobile
```
Mobile version of employer dashboard.

SECTIONS:
- Stats cards (2x2 grid): Active Jobs, Applications, Matches, Messages
- Recent applications list
- Job performance chart
- Quick actions: Post Job, View Pipeline

INTERACTION:
- Card tap to navigate
- Swipe between stats

ICONS: work, group, favorite, chat, add, trending_up
```

### 13. Partner Members Mobile
```
Mobile version of referred members list.

SECTIONS:
- Stats: Total, Active, Placed, At Risk
- Filter chips
- Member cards: Photo, Name, Program, Status, Last Activity
- Search bar

INTERACTION:
- Tap for detail
- Quick filter

ICONS: group, person, filter_list, search
```

---

## 🟠 PRIORITY 3: Admin Portal (Complete)

### 14. Admin Dashboard (Desktop + Mobile + Dark)
```
Create admin dashboard for WorkforceAP.

SECTIONS:
- KPI cards: Total Members, Active Counselors, Partner Orgs, Jobs Posted
- Charts: Member growth (line), Program distribution (pie), Pipeline funnel
- Recent activity feed
- Quick actions: Add Member, Add Counselor, Post Job
- Alerts/Notifications panel

DESIGN:
- Data visualization focus
- Admin-appropriate color scheme (can use same tokens)
- Dense information layout

LAYOUT:
- Desktop: Multi-column dashboard
- Mobile: Stacked cards, simplified charts

ICONS: dashboard, group, people, business, work, add_circle
```

### 15. Admin Members List (Desktop + Mobile + Dark)
```
Create member management page for admin.

SECTIONS:
- Search + Advanced filters
- Data table: Name, Email, Program, Counselor, Status, Last Active, Actions
- Bulk actions bar
- Pagination
- Export button

INTERACTION:
- Sort columns
- Select all/none
- Row actions: Edit, View, Deactivate
- Filter drawer on mobile

ICONS: group, search, filter_list, download, more_vert, edit
```

### 16. Admin Member Detail (Desktop + Mobile + Dark)
```
Create member detail view for admin.

SECTIONS:
- Profile header with status badge
- Contact info card
- Program enrollment card
- Progress timeline
- Activity log
- Counselor assignment
- Notes section
- Action buttons: Edit, Message, Deactivate

LAYOUT:
- Desktop: 2-3 column layout
- Mobile: Tabbed interface

ICONS: person, edit, chat, history, note_add, block
```

### 17. Admin Pipeline (Desktop + Mobile + Dark)
```
Create hiring pipeline view for admin.

SECTIONS:
- Kanban columns: New Lead, Applied, Phone Screen, Interview, Offer, Placed
- Member cards with avatar, name, target role
- Filter by program, counselor
- Drag and drop (if supported)
- Stage counts

LAYOUT:
- Desktop: Horizontal scroll Kanban
- Mobile: Vertical stack by stage

ICONS: funnel, person, work, phone, event, check_circle
```

### 18. Admin Messages (Desktop + Mobile + Dark)
```
Create admin messaging center.

SECTIONS:
- Split pane: Thread list | Conversation
- Thread list: Avatar, Name, Role (Member/Counselor/Employer), Preview, Time
- Search/filter by role
- Broadcast message option

LAYOUT:
- Desktop: Side-by-side
- Mobile: List → Detail navigation

ICONS: chat, send, broadcast, search, filter_list
```

---

## 🎨 Design System Reminders

### Color Tokens (Material 3)
```
Primary: #8c0f37
Primary Container: #ad2c4d
Secondary: #7b5800
Secondary Container: #ffbb00
Tertiary: #474646
Surface: #fcf9f8 (light), #121416 (dark)
Surface Container: #f0edec (light), #1e2022 (dark)
Error: #ba1a1a
Success: #006d3e
```

### Typography
```
Font: Inter
Headlines: 300-800 weight
Body: 400-500 weight
Labels: 600 weight, uppercase, tracking-wide
```

### Spacing
```
Base: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64
Border radius: 0.125rem (DEFAULT), 0.5rem (lg), 0.75rem (full)
```

### Icons
```
Library: Material Symbols Outlined
Weight: 400
Fill: 0 (outline), 1 (filled for active states)
```

---

## 📱 Responsive Breakpoints

```
Mobile: < 640px (default)
Tablet: 640px - 1024px (sm, md)
Desktop: > 1024px (lg, xl)
```

---

## 🌓 Dark Mode Requirements

ALL designs must include:
1. Light mode version (default)
2. Dark mode version (class="dark")
3. Proper contrast ratios (WCAG AA minimum)
4. Consistent surface hierarchy

---

## 📤 Output Format

For each design, generate:
1. Desktop HTML (light mode)
2. Desktop HTML (dark mode)  
3. Mobile HTML (light mode)
4. Mobile HTML (dark mode)

Save to: `.stitch/[page-name]-[variant].html`
