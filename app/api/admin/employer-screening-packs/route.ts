import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';

const questionSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().min(1).max(2000),
  type: z.enum(['short_text', 'yes_no']),
});

const bodySchema = z.object({
  programSlug: z.string().min(1).max(120),
  employerLabel: z.string().min(1).max(200),
  packTitle: z.string().min(1).max(200),
  questionsJson: z.array(questionSchema).min(1).max(20),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const packs = await prisma.employerScreeningPack.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });
  return NextResponse.json({ packs });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const pack = await prisma.employerScreeningPack.create({
      data: {
        programSlug: parsed.data.programSlug,
        employerLabel: parsed.data.employerLabel,
        packTitle: parsed.data.packTitle,
        questionsJson: parsed.data.questionsJson,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ pack });
  } catch (err) {
    captureApiError(err, { route: 'admin/employer-screening-packs' });
    return NextResponse.json({ error: 'Unable to create pack' }, { status: 500 });
  }
}
