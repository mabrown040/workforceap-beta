import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import {
  hasSubstantiveResumeText,
  sanitizeResumePlainText,
} from '@/lib/resume/extractionQuality';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const FILE_RESUME_MAX = 6000;
const LIVE_DRAFT_MAX = 6000;

async function getResumeCoachDynamicVariables(
  userId: string,
  opts: { liveResumeDraft?: string }
): Promise<Record<string, string>> {
  try {
    const [base, dbUser] = await Promise.all([
      fetchMemberPortalDynamicVariables(userId),
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
    ]);
    if (!dbUser) {
      return {};
    }

    const fileResume = sanitizeResumePlainText(
      (await getMemberResumePlainText(userId, FILE_RESUME_MAX)) ?? '',
    );
    const draft = sanitizeResumePlainText(opts.liveResumeDraft ?? '');

    const resumeFileOnProfile = !!(
      dbUser.profile?.resumeOriginalPath || dbUser.profile?.resumeEnhancedPath
    );

    const hasUsableFileText = hasSubstantiveResumeText(fileResume);
    const hasUsableDraft = hasSubstantiveResumeText(draft);
    const hasUsableResume = hasUsableFileText || hasUsableDraft;

    return {
      ...base,
      resume_text: fileResume.slice(0, FILE_RESUME_MAX),
      live_resume_draft: draft.slice(0, LIVE_DRAFT_MAX),
      /** True only when we have substantive extracted file text and/or a substantive live draft (voice start snapshot). */
      has_resume: hasUsableResume ? 'true' : 'false',
      /** True when a file path exists on profile (even if extraction failed or text is short). For agent: uploaded but unreadable vs no upload. */
      resume_file_on_profile: resumeFileOnProfile ? 'true' : 'false',
    };
  } catch (err) {
    console.error('[resume-coach] context fetch error:', err);
    return {};
  }
}export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    let liveResumeDraft = '';
    try {
      const body = (await req.json()) as { liveResumeDraft?: unknown };
      if (typeof body?.liveResumeDraft === 'string') {
        liveResumeDraft = body.liveResumeDraft;
      }
    } catch {
      /* empty body */
    }
  
    try {
      const dynamicVariables = await getResumeCoachDynamicVariables(user.id, { liveResumeDraft });
      const {
        signedUrl,
        expiresAt,
        dynamicVariables: clampedDynamicVariables,
      } = await startElevenLabsPortalSession('resume_coach', {
        dynamicVariables,
      });
      return NextResponse.json({
        signedUrl,
        expiresAt,
        dynamicVariables: clampedDynamicVariables ?? {},
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session';
      console.error('[member/resume-coach/session]', msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/resume-coach/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
