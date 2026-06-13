import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { renderTemplate, getDefaultSampleData } from '@/lib/admin/emailTemplate';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const POST = withApiGuc(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const template = await prisma.$transaction((tx) => tx.emailTemplate.findUnique({ where: { id } }));
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: { variables?: Record<string, string> } = {};
    try { body = await req.json(); } catch { /* no body is fine */ }

    const sampleData = body.variables ?? getDefaultSampleData(template.variables);
    const rendered = renderTemplate(template, sampleData);

    return NextResponse.json({
      id: template.id,
      key: template.key,
      name: template.name,
      subject: rendered.subject,
      html: rendered.html,
      variables: template.variables,
      sampleData,
    });
  } catch (error) {
    console.error('/admin/email-templates/[id]/preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
