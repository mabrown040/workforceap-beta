/**
 * AI match suggestion - employer notification email body HTML.
 */

export function aiMatchSuggestionHtml(params: {
  jobTitle: string;
  companyName: string;
  matches: { name: string; program: string; score: number }[];
}): string {
  const { jobTitle, companyName, matches } = params;
  const listItems = matches
    .map(
      (m) =>
        `<li><strong>${m.name}</strong> — ${m.program} (match: ${m.score}%)</li>`
    )
    .join('');
  return `
    <p>We've identified top matching students for your job posting.</p>
    <p><strong>Job:</strong> ${jobTitle}</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Top matches:</strong></p>
    <ul>
      ${listItems}
    </ul>
    <p>Log in to your employer portal to view full profiles and contact these candidates.</p>
  `.trim();
}
