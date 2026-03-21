/**
 * Job approved - employer notification email body HTML.
 */

export function jobApprovedHtml(params: {
  jobTitle: string;
  companyName: string;
}): string {
  const { jobTitle, companyName } = params;
  return `
    <p>Great news! Your job posting has been approved and is now live on the WorkforceAP job board.</p>
    <p><strong>Job:</strong> ${jobTitle}</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <p>Students and graduates can now view and apply to this position. You'll receive email notifications when applicants apply.</p>
    <p>Log in to your employer portal to manage applications and view AI-suggested candidate matches.</p>
  `.trim();
}
