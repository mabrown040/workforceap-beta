# Account recovery and funding notification incident — September 9, 2026

The reported administrator lockout and training email were investigated against the deployed production revision `461956ad59a607495073343838f32a1bd82af432`. The homepage and the unmerged practice-lab feature are outside this hotfix.

## Verified production evidence

- The administrator's September 2 member-deletion audit has the same actor and target user ID. The endpoint allowed the administrator to delete their own account.
- A September 3 restore recreated the administrator's Auth identity under the original application user ID. At investigation time the account was active, confirmed, unbanned, and retained its existing administrator role; the recreated identity had no successful sign-in recorded.
- The separately reported work address had a legacy active administrator profile but no matching Auth identity. After rechecking the exact application ID/address and the absent Auth ID, its passwordless Auth identity was restored under that same ID at 16:17 UTC. The application profile, roles, and records were preserved, and no email was sent. This is an existing account requiring password recovery, not an unused address for a new member application.
- The September 7 Auth log records a successful recovery-link generation for the administrator. This establishes token generation, not inbox delivery. No matching password-reset failure was present in application email diagnostics.
- Supabase's production redirect allowlist included `/login` but omitted `/reset-password`. The exact reset path and an escaped-query pattern for its `redirectTo` parameter were added through the Management API, then read back. Existing allowlist entries were preserved.

Private identity details, credentials, recovery links, and supplied screenshots are deliberately excluded from this repository document. No account passwords or roles were changed during diagnosis.

## Code corrections

- Reject administrator self-deletion and administrator deletion through member-management actions.
- Release a deleted member's email in both the application and Auth systems while retaining the original identity for restoration. Return a retryable failure if Auth cannot complete its part.
- Complete Auth restoration before publishing an active application account. Keep failed restores retryable and reject identity/email collisions instead of reassigning primary user IDs. Avoid a guessed Auth rollback that could re-lock a concurrent successful restore.
- Reject application-deleted accounts at login even if a provider-side ban previously failed.
- Try the configured Supabase mailer if branded password recovery fails; report service failures and throttling honestly. Handle one-use recovery tokens once and recover from network failures in the reset form.
- Replace the inaccurate course-accountability email with the supplied reserved-seat/funding-pending wording. Assignment confirmations no longer imply funded enrollment, immediate course access, or an unsupported completion statistic.
- Limit the funding update to primary program assignments without a recorded funding source or Coursera approval. Preserve dispatch deduplication and outreach cooldowns.

## Operational verification boundary

Production account state and audit evidence were read directly. Sending a recovery email to the administrator requires the user's confirmation; provider acceptance alone will not be described as inbox delivery or successful account recovery. The administrator must choose the new password and confirm access.

The allowlist correction follows [Supabase's redirect URL documentation](https://supabase.com/docs/guides/auth/redirect-urls). Supabase configuration responses hash SMTP secrets; a returned hash must not be treated as a usable provider credential.
