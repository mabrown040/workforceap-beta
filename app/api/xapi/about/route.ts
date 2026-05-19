import { NextResponse } from 'next/server';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
  try {
  return NextResponse.json({
    version: ['1.0.3'],
  });

  } catch (error) {
    console.error('/xapi/about error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

