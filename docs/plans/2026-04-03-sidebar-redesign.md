# Member Portal Navigation Redesign

> **Goal:** Replace the long 22-item sidebar with a simpler top-tab + contextual sub-nav approach.

## Current State
- `WorkspaceShell.tsx` renders a sidebar with 22 nav items in 4 groups
- Groups: primary (3), workflows (8), insights (4), manage (4)  
- Mobile: hamburger → drawer overlay
- Desktop: collapsible sidebar

## New Structure: 4 Top Tabs + Sub-Nav

Based on Stitch prototypes (segmented control variant):

### Tab 1: **My Journey** (default)
- Overview (`/dashboard`)
- My Program (`/dashboard/program`)
- Training (`/dashboard/training`)
- Career Readiness (`/dashboard/readiness`)
- Weekly Recap (`/dashboard/weekly-recap`)
- Career Brief (`/dashboard/career-brief`)

### Tab 2: **Career Tools**
- AI Tools (`/dashboard/ai-tools` + all sub-routes)
- Resume (`/dashboard/resume`)
- Learning Hub (`/dashboard/learning`)
- Interest Profiler (`/dashboard/learning/interest-profiler`)
- Skills Assessment (`/dashboard/skills-assessment`)
- Certificates (`/dashboard/certifications`)

### Tab 3: **Connect**
- Job Board (`/dashboard/jobs`)
- Job Applications (`/dashboard/job-applications`)
- Messages (`/dashboard/messages`)
- Program Resources (`/dashboard/resources`)
- Member Guide (`/dashboard/guide`)

### Tab 4: **Me**
- Profile (`/dashboard/profile`)
- Settings (`/dashboard/settings`)

## Implementation Approach

### Phase 1: Nav Config Restructure
- Add `tab` field to `PortalNavItem` type: `'journey' | 'tools' | 'connect' | 'me'`
- Update `MEMBER_PORTAL_NAV_ITEMS` with tab assignments
- Keep `group` for backward compat but add `tab`

### Phase 2: Tab Bar Component
- New `WorkspaceTabBar.tsx` — horizontal tabs with icons
- Mobile: scrollable pill row (like MobileBottomNav but at top, below header)
- Desktop: horizontal tabs below header, above content

### Phase 3: Sub-Nav
- When a tab is active, show its items as a compact vertical list or horizontal sub-nav
- Desktop sidebar becomes just the active tab's items (much shorter)
- Mobile: sub-nav items shown below tab bar as scrollable chips or compact list

### Phase 4: Remove Old Sidebar
- Simplify WorkspaceShell — remove group labels, collapse logic
- The sidebar just shows the active tab's items now

## Files to Modify
- `lib/nav/portalNav.ts` — add tab field
- `components/portal/WorkspaceShell.tsx` — add tab bar, filter sidebar by active tab
- `css/main.css` — workspace tab bar styles
- `components/portal/MemberWorkspaceShell.tsx` — pass tab context
