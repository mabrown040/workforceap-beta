/**
 * Weekly recap email body HTML.
 */

export function weeklyRecapHtml(params: { firstName: string; recapSummary: string }): string {
  const { firstName, recapSummary } = params;
  return `
    <p>Hi ${firstName},</p>
    <p>Here's your WorkforceAP weekly recap:</p>
    <p>${recapSummary}</p>
    <p>View your full recap in the dashboard for detailed progress and recommended next actions.</p>
  `.trim();
}
