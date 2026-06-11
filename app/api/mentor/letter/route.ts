import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'mentor';
}

export const GET = withApiGuc(async (req: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mentorId = searchParams.get('mentorId');

  if (!mentorId) return NextResponse.json({ error: 'mentorId required' }, { status: 400 });

  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, userId: user.id, isActive: true },
    include: {
      sessions: {
        where: { status: 'COMPLETED', hoursLogged: { not: null } },
        select: { hoursLogged: true, scheduledAt: true },
      },
    },
  });

  if (!mentor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const totalHours = mentor.sessions.reduce((sum, s) => sum + (s.hoursLogged ?? 0), 0);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const year = new Date().getFullYear();
  const mentorFullName = escapeHtml(mentor.fullName);
  const mentorTitle = escapeHtml(mentor.title);
  const mentorCompany = escapeHtml(mentor.company);
  const mentorFirstName = escapeHtml(mentor.fullName.split(' ')[0] || mentor.fullName);
  const filename = safeFilenamePart(mentor.fullName);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Volunteer Hour Letter — ${mentorFullName}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 680px; margin: 60px auto; color: #1c1b1b; line-height: 1.7; }
    .header { border-bottom: 2px solid #AD2C4D; padding-bottom: 16px; margin-bottom: 32px; }
    .org-name { font-size: 22px; font-weight: 700; color: #AD2C4D; }
    .org-sub { font-size: 13px; color: #584144; margin-top: 4px; }
    h2 { font-size: 18px; margin-bottom: 8px; }
    .hours { font-size: 32px; font-weight: 700; color: #AD2C4D; }
    .footer { margin-top: 48px; border-top: 1px solid #e8e8e8; padding-top: 20px; font-size: 12px; color: #584144; }
    @media print { body { margin: 40px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">WorkforceAP</div>
    <div class="org-sub">Workforce Advancement Project · Nonprofit 501(c)(3) · workforceap.org</div>
  </div>

  <p>${date}</p>

  <p>To Whom It May Concern,</p>

  <p>This letter confirms that <strong>${mentorFullName}</strong>, ${mentorTitle} at ${mentorCompany}, has volunteered their professional expertise as a career mentor with WorkforceAP during the ${year} calendar year.</p>

  <p><strong>Total volunteer hours logged:</strong></p>
  <div class="hours">${totalHours.toFixed(1)} hours</div>

  <p>WorkforceAP is a 501(c)(3) nonprofit organization dedicated to providing career training and job placement support to adults at no cost to members. ${mentorFullName}&rsquo;s volunteer mentorship directly supported members working to advance their careers.</p>

  <p>Per IRS guidelines, services donated to a 501(c)(3) organization may have tax implications. We recommend consulting your tax advisor regarding the deductibility of professional services donated to nonprofit organizations.</p>

  <p>We are deeply grateful for ${mentorFirstName}&rsquo;s contribution to our members and our mission.</p>

  <p>Sincerely,</p>
  <p><strong>WorkforceAP Leadership Team</strong><br>
  Workforce Advancement Project<br>
  info@workforceap.org · workforceap.org</p>

  <div class="footer">
    This letter was generated on ${date} from the WorkforceAP mentor portal. For questions, contact info@workforceap.org.
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="volunteer-letter-${filename}.html"`,
    },
  });

  } catch (error) {
    console.error('/mentor/letter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
