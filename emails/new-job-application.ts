/**
 * New application to employer job - employer notification email body HTML.
 */

export function newJobApplicationHtml(params: {
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicationId: string;
}): string {
  const { jobTitle, applicantName, applicantEmail, applicationId } = params;
  return `
    <p>A new applicant has applied to your job posting.</p>
    <p><strong>Job:</strong> ${jobTitle}</p>
    <p><strong>Applicant:</strong> ${applicantName}</p>
    <p><strong>Email:</strong> ${applicantEmail}</p>
    <p><strong>Application ID:</strong> ${applicationId}</p>
    <p>Log in to your employer portal to view the full application and resume.</p>
  `.trim();
}
