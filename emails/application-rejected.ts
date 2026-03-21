/**
 * Application rejected email body HTML.
 */

export function applicationRejectedHtml(params: { firstName: string }): string {
  const { firstName } = params;
  return `
    <p>Hello ${firstName},</p>
    <p>Thank you for your interest in WorkforceAP. After careful review, we are unable to offer you a place in our program at this time.</p>
    <p>We encourage you to explore other opportunities and resources that may be available in your area. Consider reaching out to your local workforce center or workforce solutions office for additional guidance.</p>
    <p>If you have questions about this decision or would like to reapply in the future, please don't hesitate to contact us.</p>
  `.trim();
}
