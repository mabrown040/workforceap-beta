import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getProgramBySlug } from '@/lib/content/programs';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { checkAIToolRateLimit } from '@/lib/rate-limit';

const BUCKET = 'member-resumes';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAIConfigured()) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body: { resumeBase?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const profile = dbUser.profile;

  // Try to extract text from the uploaded original resume
  let resumeText = body.resumeBase?.trim() || '';
  if (!resumeText && profile?.resumeOriginalPath) {
    try {
      const supabaseRead = getSupabaseAdmin();
      const { data: fileData } = await supabaseRead.storage.from(BUCKET).download(profile.resumeOriginalPath);
      if (fileData) {
        const ext = profile.resumeOriginalPath.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') {
          // Extract text from PDF — read as text (works for text-based PDFs)
          const rawText = await fileData.text();
          // Clean up PDF binary artifacts — keep only printable text
          resumeText = rawText
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s{3,}/g, '\n')
            .trim()
            .slice(0, 6000);
        } else {
          // DOC/DOCX — extract as text
          resumeText = (await fileData.text()).slice(0, 6000);
        }
      }
    } catch (err) {
      console.error('Failed to read original resume from storage:', err);
      // Continue without resume text — will generate from profile
    }
  }

  const context = [
    `Name: ${dbUser.fullName ?? 'N/A'}`,
    `Email: ${dbUser.email}`,
    `Phone: ${profile?.profilePhone ?? dbUser.phone ?? 'N/A'}`,
    `Address: ${profile?.profileAddress ?? profile?.address ?? 'N/A'}`,
    `LinkedIn: ${profile?.profileLinkedin ?? 'N/A'}`,
    `Bio: ${profile?.profileBio ?? 'N/A'}`,
    `Employment: ${profile?.employmentStatus ?? 'N/A'}`,
    `Education: ${profile?.educationLevel ?? 'N/A'}`,
    `Target program: ${program?.title ?? dbUser.enrolledProgram ?? 'Career training'}`,
    `Program category: ${program?.categoryLabel ?? 'N/A'}`,
  ].join('\n');

  const systemPrompt = `You are a professional resume writer for career changers. Write an ATS-friendly resume based on the following profile and any existing resume provided. Add a professional summary, use action verbs, include a certification objective. Keep to 1 page. Return the resume as markdown.`;

  const userContent = resumeText
    ? `Base resume to improve:\n\n${resumeText}\n\n---\nProfile context:\n${context}`
    : `Create a resume from this profile:\n\n${context}`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { maxTokens: 2000, temperature: 0.5 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const supabase = getSupabaseAdmin();
    const path = `${user.id}/resume-enhanced.txt`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, output, {
      upsert: true,
      contentType: 'text/plain',
    });

    if (error) {
      console.error('Resume save error:', error);
      return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 });
    }

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, resumeEnhancedPath: path, role: 'member' },
      update: { resumeEnhancedPath: path },
    });

    return NextResponse.json({ ok: true, resume: output, path });
  } catch (err) {
    console.error('Generate resume error:', err);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}
