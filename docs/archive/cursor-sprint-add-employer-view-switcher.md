# Cursor Sprint: Add Employer to View Switcher

## Task ID
workforceap-add-employer-view-switcher

## Repository
https://github.com/mabrown040/workforceap-beta

## Goal
Add Employer Portal option to view switcher dropdown

## Current State
View switcher shows:
- Admin Portal
- Partner Portal
- Student Portal

## Required Change
Add "Employer Portal" option when user has super_admin role

## Implementation
1. Find view switcher component (likely in AdminHeader or similar)
2. Add Employer option with icon
3. Route: /employer/dashboard
4. Show only for super_admin users

## Files to Check
- components/admin/AdminHeader.tsx
- components/ui/ViewSwitcher.tsx (if exists)
- Any portal navigation components

## Success Criteria
- [ ] Employer Portal appears in dropdown
- [ ] Clicking it navigates to /employer/dashboard
- [ ] Only visible to super_admin users
- [ ] PR created and merged
