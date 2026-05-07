# Sprint 9: Audit bug fixes

## Implemented in repo (core audit items)

1. **Portal tour** ? `done` state clears overlay and highlight immediately; **Skip tour** link in the popover footer; completing the last step sets `done` before async `tour-complete`.
2. **Apply / dark mode** ? `html.dark` rules for `.apply-location-callout`, `.apply-eligibility-note`, apply/inner-page form labels, inputs, selects, textareas, and `.form-radio-card`.
3. **Programs page plural** ? `View {count} {count === 1 ? 'course' : 'courses'}` in `ProgramsContent.tsx` (no broken `course` + `s` split).
4. **Apply scroll progress** ? `ApplyFormStatusBar` uses the **earliest** intersecting section index so a lower step is not marked complete when a lower section is still on screen.
5. **Partner referral** ? `components/partner/CopyReferralLink.tsx` on the partner overview referral block.
6. **Employer settings** ? Fixed-position toast for ~4s on successful save (inline ?Saved.? remains).
7. **?Viewing as ?? banner** ? Shown only when `superAdminImpersonating` is true: employer layout checks `wa_super_admin_employer_id` cookie; partner keeps existing `superUser && !directPartnerUser` behavior.
8. **Applicants title** ? `WorkforceAP Applicants` in `employer/applications` metadata (no ?Workforce AP? space).

## Spec reference (additional backlog ? not all shipped here)

The following were in an expanded Sprint 9 draft and may be tracked separately:

- Auto-seed empty admin program catalog
- Missing `metadata` on some admin list pages
- Reusable confirmation modals for destructive admin member actions

Run `npx tsc --noEmit` after changes.
