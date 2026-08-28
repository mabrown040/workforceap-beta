import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import {
  resolveCounselorVoiceSessionPlan,
  startElevenLabsPortalSession,
} from '@/lib/ai/elevenlabsAgents';
import {
  fetchCounselorPortalDynamicVariables,
  fetchMemberPortalDynamicVariables,
} from '@/lib/ai/elevenlabsPortalContext';
import { cookies } from 'next/headers';
import { getAppLocaleFromCookieStore } from '@/lib/i18n/cookieLocale';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rawBody = await request.json().catch(() => ({}));
    const requestedAudience =
      rawBody && typeof rawBody === 'object'
        ? (rawBody as { audience?: unknown }).audience
        : undefined;
    const canUseStaffVoice =
      requestedAudience === 'staff'
        ? (await isCounselor(user.id)) || (await isAdmin(user.id))
        : false;
    const plan = resolveCounselorVoiceSessionPlan(requestedAudience, canUseStaffVoice);
    if (!plan.ok) {
      return NextResponse.json({ error: plan.error }, { status: plan.status });
    }

    // Both member and staff voice sessions share the same per-user limiter.
    const { success: voiceRateOk } = await checkVoiceSessionRateLimit(user.id);
    if (!voiceRateOk) {
      return NextResponse.json(
        { error: 'Too many voice sessions. Please wait an hour before starting another.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const cookieStore = await cookies();
    const locale = getAppLocaleFromCookieStore(cookieStore);
  
    try {
      const dynamicVariables =
        plan.contextKind === 'staff'
          ? await fetchCounselorPortalDynamicVariables(user.id)
          : await fetchMemberPortalDynamicVariables(user.id);
      const { signedUrl, expiresAt, dynamicVariables: returned } =
        await startElevenLabsPortalSession(plan.agentKey, {
          dynamicVariables,
          locale,
        });
      return NextResponse.json({
        signedUrl,
        expiresAt,
        dynamicVariables: returned ?? dynamicVariables,
        audience: plan.audience,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[counselor/session]', msg);
      return NextResponse.json({ error: 'Voice sessions are not configured' }, { status: 503 });
    }
  } catch (error) {
    console.error('/counselor/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
