import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchCounselorPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { cookies } from 'next/headers';
import { getAppLocaleFromCookieStore } from '@/lib/i18n/cookieLocale';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const locale = getAppLocaleFromCookieStore(cookieStore);

  try {
    const dynamicVariables = await fetchCounselorPortalDynamicVariables(user.id);
    const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('counselor', {
      dynamicVariables,
      locale,
    });
    return NextResponse.json({
      signedUrl,
      expiresAt,
      dynamicVariables: returned ?? dynamicVariables,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[counselor/session]', msg);
    return NextResponse.json({ error: 'Voice sessions are not configured' }, { status: 503 });
  }
}
