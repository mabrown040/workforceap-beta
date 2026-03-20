/**
 * Inactive member nudge email body HTML.
 */

export function inactiveNudgeHtml(params: { firstName: string }): string {
  const { firstName } = params;
  return `
    <p>Hi ${firstName},</p>
    <p>We noticed you haven't been active in WorkforceAP recently. We're here to help!</p>
    <p>Whether you're facing a busy schedule or need support—your progress matters to us. Log in anytime to pick up where you left off.</p>
    <p>If you have questions or need assistance, reach out to your counselor or contact us at info@workforceap.org.</p>
  `.trim();
}
