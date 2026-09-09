/** Reserved-seat funding update. This message does not confirm funded enrollment. */
import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseAccountabilityHtml(params: {
  firstName: string;
  programName: string;
}): string {
  const { firstName, programName } = params;
  return `
    <p>Hello ${escapeHtml(firstName)},</p>
    <p>Your seat for the ${escapeHtml(programName)} training program is reserved.</p>
    <p>We are now working to identify a WIOA training grant, another grant, and/or a scholarship to cover the cost of your training.</p>
    <p>Once funding is secured and approved, you will be officially enrolled and notified when you can begin classes.</p>
    <p>We will keep you updated throughout the funding and enrollment process.</p>
  `.trim();
}
