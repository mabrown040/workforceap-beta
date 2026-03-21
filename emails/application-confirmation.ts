/**
 * Application confirmation email body HTML — sent to applicant after form submit.
 */

export function applicationConfirmationHtml(params: { firstName: string }): string {
  const { firstName } = params;
  return `
    <p>Hi ${firstName},</p>
    <p>We&rsquo;ve received your application to the Workforce Advancement Project. Here is what happens next:</p>
    <ol>
      <li><strong>Our team reviews your application</strong> &mdash; within 5 business days</li>
      <li><strong>You&rsquo;ll receive an email with next steps</strong> &mdash; including enrollment details</li>
      <li><strong>If accepted, you&rsquo;ll get access to your student portal</strong> &mdash; training, AI career tools, and your counselor all in one place</li>
    </ol>
    <p>Questions? Call <a href="tel:+15127771808">(512) 777-1808</a> or email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>
    <p>While you wait, bookmark your portal login at <a href="https://www.workforceap.org/login">workforceap.org/login</a>.</p>
  `.trim();
}
