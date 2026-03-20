/**
 * Application accepted email body HTML.
 */

export function applicationAcceptedHtml(params: { firstName: string }): string {
  const { firstName } = params;
  return `
    <p>Congratulations, ${firstName}!</p>
    <p>Your application to WorkforceAP has been accepted. We're excited to have you join our program.</p>
    <p><strong>Next steps:</strong></p>
    <ul>
      <li>Log in to your dashboard to access your program materials</li>
      <li>Complete your profile and assessment if you haven't already</li>
      <li>Select your program and start your training</li>
    </ul>
    <p>If you have any questions, reach out to your counselor or contact us at info@workforceap.org.</p>
  `.trim();
}
