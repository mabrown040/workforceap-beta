import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getProgramBySlug } from '@/lib/content/programs';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';

const BUCKET = 'member-resumes';

async function getResumeContext(userId: string): Promise<string> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!dbUser) return '';

    const parts: string[] = [];

    // Basic member info
    parts.push(`Member: ${dbUser.fullName ?? 'Unknown'}`);
    const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
    if (program) {
      parts.push(`Program: ${program.title}`);
      if (program.skills?.length) parts.push(`Program skills: ${program.skills.join(', ')}`);
    }

    // Try to get resume text
    const resumePath = dbUser.profile?.resumeEnhancedPath ?? dbUser.profile?.resumeOriginalPath;
    if (resumePath) {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.storage.from(BUCKET).download(resumePath);
      if (data) {
        const text = await data.text();
        if (text && text.length > 10) {
          // Truncate to avoid token limits
          parts.push(`\n--- MEMBER'S CURRENT RESUME ---\n${text.slice(0, 4000)}`);
        }
      }
    }

    if (parts.length <= 1) return '';

    return [
      'You are coaching the following member on their resume. Reference their actual resume content when giving suggestions.',
      'When suggesting changes, be specific — quote the original text and provide the improved version.',
      '',
      ...parts,
    ].join('\n');
  } catch (err) {
    console.error('[resume-coach] context fetch error:', err);
    return '';
  }
}

/** POST — signed URL for resume-focused voice coach with member context. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const dynamicContext = await getResumeContext(user.id);
    const { signedUrl, expiresAt } = await startElevenLabsPortalSession('resume_coach', {
      dynamicContext: dynamicContext || undefined,
    });
    return NextResponse.json({ signedUrl, expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[member/resume-coach/session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
