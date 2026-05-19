import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { fetchInterviewPrepBundle } from '@/lib/member/interviewPrepBundle';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
  try {
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

  } catch (error) {
    console.error('/member/prep-bundle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

