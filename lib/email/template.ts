/**
 * Shared branded email layout for WorkforceAP transactional emails.
 * Dark header, white body, footer. Use with Resend.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const LOGO_URL = `${SITE_URL}/images/logo-tight.png`;

export function brandedEmailLayout(options: {
  title: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const { title, bodyHtml, ctaText, ctaUrl } = options;
  const ctaBlock =
    ctaText && ctaUrl
      ? `
    <p style="margin: 1.5rem 0;">
      <a href="${ctaUrl}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #4a9b4f; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        ${ctaText}
      </a>
    </p>
  `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f5f5f5; padding: 2rem 1rem;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: #1a1a1a; padding: 1.5rem 2rem; border-radius: 8px 8px 0 0; text-align: center;">
              <a href="${SITE_URL}" style="display: inline-block;">
                <img src="${LOGO_URL}" alt="Workforce Advancement Project" width="180" height="92" style="display: block; max-width: 180px; height: auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="background: white; padding: 2rem; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
              <h1 style="margin: 0 0 1rem; font-size: 1.5rem; color: #1a1a1a;">${title}</h1>
              <div style="color: #333; line-height: 1.6; font-size: 1rem;">
                ${bodyHtml}
                ${ctaBlock}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0 1rem;" />
              <p style="margin: 0; font-size: 0.85rem; color: #888;">
                Workforce Advancement Project &middot; Career training and industry certifications
              </p>
              <p style="margin: 0.25rem 0 0; font-size: 0.8rem;">
                <a href="${SITE_URL}" style="color: #4a9b4f;">workforceap.org</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
