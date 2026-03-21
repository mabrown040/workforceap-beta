/**
 * Day 3 applicant follow-up email body HTML.
 */

export function applicantFollowupHtml(params: { firstName: string; expectedDate: string }): string {
  const { firstName, expectedDate } = params;
  return `
    <p>Hi ${firstName},</p>
    <p>We wanted to let you know that your application to the Workforce Advancement Project is being reviewed by our team.</p>
    <p>We expect to have an update for you by <strong>${expectedDate}</strong>.</p>
    <p>In the meantime, here are some resources to explore:</p>
    <ul>
      <li><a href="https://www.workforceap.org/programs">Browse our 19 career programs</a></li>
      <li><a href="https://www.workforceap.org/faq">Frequently asked questions</a></li>
      <li><a href="https://www.workforceap.org/how-it-works">How it works</a></li>
    </ul>
    <p>If you have questions, call <a href="tel:+15127771808">(512) 777-1808</a> or email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>
  `.trim();
}
