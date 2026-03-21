/**
 * New application admin alert email body HTML.
 */

export function newApplicationAlertHtml(params: {
  applicantName: string;
  applicantEmail: string;
  programInterest: string;
  applicationId: string;
}): string {
  const { applicantName, applicantEmail, programInterest, applicationId } = params;
  return `
    <p>A new application has been submitted.</p>
    <p><strong>Applicant:</strong> ${applicantName}</p>
    <p><strong>Email:</strong> ${applicantEmail}</p>
    <p><strong>Program interest:</strong> ${programInterest}</p>
    <p><strong>Application ID:</strong> ${applicationId}</p>
    <p>Please review the application in the admin panel.</p>
  `.trim();
}
