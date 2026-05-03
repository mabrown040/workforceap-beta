import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { fetchInterviewPrepBundle } from '@/lib/member/interviewPrepBundle';

/**
 * GET /api/member/prep-bundle
 * Returns the bundle data for display (no email sent).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bundle = await fetchInterviewPrepBundle(user.id);
  return NextResponse.json({
    items: bundle.items.map(i => ({
      toolType: i.toolType,
      title: i.title,
      content: i.content,
      createdAt: i.createdAt.toISOString(),
    })),
    generatedAt: bundle.generatedAt.toISOString(),
    empty: bundle.empty,
  });
}
