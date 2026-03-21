/**
 * Weekly admin recap email body HTML.
 */

export function adminWeeklyRecapHtml(params: {
  newApplicants: number;
  placements: number;
  atRiskStudents: number;
  pendingApplications: number;
}): string {
  const { newApplicants, placements, atRiskStudents, pendingApplications } = params;
  return `
    <p>Here is your weekly summary for WorkforceAP:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">New Applicants This Week</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center;">${newApplicants}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">Placements This Week</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center; color: #16a34a;">${placements}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">At-Risk Students</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center; color: ${atRiskStudents > 0 ? '#dc2626' : '#16a34a'};">${atRiskStudents}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-weight: 600;">Pending Applications</td>
        <td style="padding: 0.75rem; border: 1px solid #e5e5e5; font-size: 1.25rem; font-weight: 700; text-align: center; color: ${pendingApplications > 0 ? '#d97706' : '#16a34a'};">${pendingApplications}</td>
      </tr>
    </table>
    <p>Click below to view the full admin dashboard.</p>
  `.trim();
}
