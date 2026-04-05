import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/health] unexpected error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
