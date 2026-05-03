import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';
import { getEmailTemplateDemoByCronId } from '@/lib/admin/emailTemplateDemoPreviews';
import { brandedEmailLayout } from '@/lib/email/template';

export type TemplatePreviewResponse = {
  cronId: string;
  cronName: string;
  subject: string;
  html: string;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await requireAdmin(user.id); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  const { id } = await ctx.params;

  const preview = buildPreview(id);
  if (!preview) return NextResponse.json({ error: 'Unknown cron id' }, { status: 404 });

  return NextResponse.json(preview);
}

function buildPreview(id: string): TemplatePreviewResponse | null {
  const demo = getEmailTemplateDemoByCronId(id);
  if (!demo) return null;

  const cronName = CRON_REGISTRY.find((c) => c.id === id)?.name ?? id;

  return {
    cronId: id,
    cronName,
    subject: demo.subject,
    html: brandedEmailLayout({
      title: demo.title,
      bodyHtml: demo.bodyHtml,
      ctaText: demo.ctaText,
      ctaUrl: demo.ctaUrl,
    }),
  };
}
