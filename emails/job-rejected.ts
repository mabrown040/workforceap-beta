/**
 * Job rejected - employer notification email body HTML.
 */

export function jobRejectedHtml(params: {
  jobTitle: string;
  companyName: string;
  reason: string;
}): string {
  const { jobTitle, companyName, reason } = params;
  return `
    <p>Your job posting has been reviewed but could not be approved at this time.</p>
    <p><strong>Job:</strong> ${jobTitle}</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Reason:</strong></p>
    <p>${reason}</p>
    <p>You can edit the job in your employer portal and resubmit for review, or contact us at info@workforceap.org if you have questions.</p>
  `.trim();
}
