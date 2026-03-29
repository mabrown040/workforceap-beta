import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Resend } from 'resend';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as 'approve' | 'deactivate' | 'activate';

  const mentor = await prisma.mentor.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!mentor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'approve') {
    const updated = await prisma.mentor.update({ where: { id }, data: { isActive: true, approvedAt: new Date() } });
    const key = process.env.RESEND_API_KEY;
    if (key) {
      const resend = new Resend(key);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@workforceap.org',
        to: mentor.user.email,
        subject: 'WorkforceAP — You are approved as a mentor',
        html: `<p>Hi ${mentor.fullName},</p><p>You are approved as a WorkforceAP mentor. Thank you for volunteering your expertise.</p><p>Open your mentor dashboard: <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org'}/dashboard/mentor">Mentor Portal</a></p>`,
      });
    }
    return NextResponse.json({ mentor: updated });
  }

  if (action === 'deactivate') {
    const updated = await prisma.mentor.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ mentor: updated });
  }

  if (action === 'activate') {
    const updated = await prisma.mentor.update({ where: { id }, data: { isActive: true } });
    return NextResponse.json({ mentor: updated });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
