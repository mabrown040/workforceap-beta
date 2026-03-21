/**
 * Admin alert for pending applications over 3 days old.
 */

export function adminPendingApplicantsHtml(params: { pendingCount: number }): string {
  const { pendingCount } = params;
  return `
    <p>You have <strong>${pendingCount} pending application${pendingCount === 1 ? '' : 's'}</strong> that ${pendingCount === 1 ? 'is' : 'are'} more than 3 days old and still waiting for review.</p>
    <p>Applicants receive a follow-up email at the 3-day mark letting them know their application is being reviewed. Timely review helps keep applicants engaged.</p>
    <p>Click below to review pending applications in the admin dashboard.</p>
  `.trim();
}
