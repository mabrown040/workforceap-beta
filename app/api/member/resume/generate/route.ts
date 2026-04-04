import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getProgramBySlug } from '@/lib/content/programs';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

const BUCKET = 'member-resumes';

function buildFallbackResume(params: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  bio: string;
  employment: string;
  education: string;
  targetProgram: string;
  category: string;
}) {
  const {
    fullName,
    email,
    phone,
    address,
    linkedin,
    bio,
    employment,
    education,
    targetProgram,
    category,
  } = params;

  return [
    `# ${fullName}`,
    `${email} | ${phone} | ${address}`,
    linkedin !== 'N/A' ? `LinkedIn: ${linkedin}` : '',
    '',
    '## Professional Summary',
    bio !== 'N/A'
      ? bio
      : `Motivated career-builder pursuing ${targetProgram}. Strong commitment to learning, consistency, and employer-ready execution.`,
    '',
    '## Career Objective',
    `Seeking an entry-level role aligned with ${targetProgram} (${category}).`,
    '',
    '## Core Skills',
    `- Employment status: ${employment}`,
    `- Education level: ${education}`,
    '- Communication and collaboration',
    '- Time management and reliability',
    '',
    '## Experience',
    '- Build this section with your latest role, measurable outcomes, and impact.',
    '- Add 3-5 bullets per role using action verbs and concrete results.',
    '',
    '## Education',
    `- ${education}`,
    '',
    '## Certifications In Progress',
    `- ${targetProgram}`,
    '',
    '_Auto-generated fallback resume. Update details before applying._',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  if (!resumeText) {
    try {
      const extracted = await getMemberResumePlainText(user.id, 6000, { preferOriginal: true });
      resumeText = extracted ?? '';
    } catch (err) {
      console.error('Failed to extract resume text:', err);
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

  const fallbackResume = buildFallbackResume({
    fullName: dbUser.fullName ?? 'WorkforceAP Member',
    email: dbUser.email,
    phone: profile?.profilePhone ?? dbUser.phone ?? 'N/A',
    address: profile?.profileAddress ?? profile?.address ?? 'N/A',
    linkedin: profile?.profileLinkedin ?? 'N/A',
    bio: profile?.profileBio ?? 'N/A',
    employment: profile?.employmentStatus ?? 'N/A',
    education: profile?.educationLevel ?? 'N/A',
    targetProgram: program?.title ?? dbUser.enrolledProgram ?? 'Career training',
    category: program?.categoryLabel ?? 'General',
  });

  try {
    let output = '';
    let fallbackUsed = false;
    if (!isAIConfigured()) {
      fallbackUsed = true;
      output = fallbackResume;
    } else {
      const { success } = await checkAIToolRateLimit(user.id);
      if (!success) {
        fallbackUsed = true;
        output = fallbackResume;
      } else {
        const aiOutput = await chatCompletion(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          { maxTokens: 2000, temperature: 0.5 }
        );
        if (!aiOutput) {
          fallbackUsed = true;
          output = fallbackResume;
        } else {
          output = aiOutput;
        }
      }
    }

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

    return NextResponse.json({ ok: true, resume: output, path, fallbackUsed });
  } catch (err) {
    console.error('Generate resume error:', err);
    const output = fallbackResume;
    try {
      const supabase = getSupabaseAdmin();
      const path = `${user.id}/resume-enhanced.txt`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, output, {
        upsert: true,
        contentType: 'text/plain',
      });

      if (error) {
        console.error('Fallback resume save error:', error);
        return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 });
      }

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, resumeEnhancedPath: path, role: 'member' },
        update: { resumeEnhancedPath: path },
      });

      return NextResponse.json({ ok: true, resume: output, path, fallbackUsed: true });
    } catch (fallbackErr) {
      console.error('Generate resume fallback error:', fallbackErr);
      return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
    }
  }
}
