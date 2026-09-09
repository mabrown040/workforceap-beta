import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadTrainingWorkspace, saveTrainingWorkspace, TrainingWorkspaceError } from '@/lib/member/loadTrainingWorkspace';
import { trainingProgramSlugSchema, trainingWorkspaceUpdateSchema } from '@/lib/member/trainingWorkspace';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };
const errorMessages = {
  PROGRAM_NOT_ASSIGNED: 'This program is not assigned to your account.',
  CURRICULUM_CHANGED: 'Your assigned curriculum changed. Reload before saving.',
  COURSE_NOT_ASSIGNED: 'This course is not part of your assigned curriculum.',
};

export const GET = withApiGuc(async (request: Request) => {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_HEADERS });
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== 'programSlug') || params.getAll('programSlug').length > 1) {
    return NextResponse.json({ error: 'Invalid query.' }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const requested = params.get('programSlug');
  const parsed = requested === null ? null : trainingProgramSlugSchema.safeParse(requested);
  if (parsed && !parsed.success) return NextResponse.json({ error: 'Invalid program.' }, { status: 400, headers: PRIVATE_HEADERS });
  try {
    const workspace = await loadTrainingWorkspace({ userId: user.id, programSlug: parsed?.success ? parsed.data : null });
    return NextResponse.json({ workspace }, { headers: PRIVATE_HEADERS });
  } catch {
    console.error('[training-workspace] Unable to load member workspace.');
    return NextResponse.json({ error: 'Your training workspace is unavailable. Please try again.' }, { status: 503, headers: PRIVATE_HEADERS });
  }
});

export const PUT = withApiGuc(async (request: Request) => {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_HEADERS });
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 60000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413, headers: PRIVATE_HEADERS });
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = trainingWorkspaceUpdateSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Check your study hours, start date, notes, and link.' }, { status: 400, headers: PRIVATE_HEADERS });
  try {
    const workspace = await saveTrainingWorkspace(user.id, parsed.data);
    return NextResponse.json({ workspace }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof TrainingWorkspaceError) {
      return NextResponse.json({ error: errorMessages[error.code], code: error.code }, { status: error.status, headers: PRIVATE_HEADERS });
    }
    console.error('[training-workspace] Unable to save member workspace.');
    return NextResponse.json({ error: 'Your work was not saved. Please try again.' }, { status: 503, headers: PRIVATE_HEADERS });
  }
});
