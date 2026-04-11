import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isMissingPrismaEnumValue } from '@/lib/db/prismaEnumFallback';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { trackEvent } from '@/lib/events/track';

/** Same private bucket as resumes; path prefix isolates mock interview videos. */
const BUCKET = 'member-resumes';

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function isValidRecordingPath(userId: string, path: string): boolean {
  const prefix = `${userId}/voice-interview-recordings/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webm|mp4)$/i.test(rest);
}

function storageErrorMessage(error: { message?: string } | null): string {
  const m = error?.message ?? '';
  if (/not found|does not exist|Bucket/i.test(m)) {
    return 'Storage is not configured. Create the member-resumes bucket in Supabase (Storage).';
  }
  return 'Failed to prepare upload';
}

/** POST JSON: prepare | complete. GET: signed download URL for own recording. */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const path = req.nextUrl.searchParams.get('path')?.trim() ?? '';
    if (!path || !isValidRecordingPath(user.id, path)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      console.error('[voice-interview/recording GET]', error);
      return NextResponse.json({ error: 'Could not create download link' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 });
  } catch (e) {
    console.error('[voice-interview/recording GET]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Expected JSON body' }, { status: 415 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === 'prepare') {
      const extRaw = typeof body.fileExt === 'string' ? body.fileExt.toLowerCase().replace(/^\./, '') : 'webm';
      const ext = extRaw === 'mp4' ? 'mp4' : 'webm';
      const supabase = getSupabaseAdmin();
      const id = crypto.randomUUID();
      const path = `${user.id}/voice-interview-recordings/${id}.${ext}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });

      if (error || !data) {
        console.error('Mock interview video prepare:', error);
        return NextResponse.json({ error: storageErrorMessage(error) }, { status: 500 });
      }

      return NextResponse.json({
        bucket: BUCKET,
        path: data.path,
        token: data.token,
        recordingId: id,
        maxBytes: MAX_VIDEO_BYTES,
      });
    }

    if (body.action === 'complete') {
      const path = typeof body.path === 'string' ? body.path : '';
      const durationMs = typeof body.durationMs === 'number' ? body.durationMs : 0;
      const role = typeof body.role === 'string' ? body.role.trim() : '';
      const interviewType = typeof body.interviewType === 'string' ? body.interviewType.trim() : '';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'video/webm';
      const byteSize = typeof body.byteSize === 'number' ? body.byteSize : 0;

      if (!path || !isValidRecordingPath(user.id, path)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }
      if (byteSize > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'Recording too large' }, { status: 400 });
      }

      const inputSummary = [role || 'Role n/a', interviewType || 'General'].join(' · ').slice(0, 500);

      const recordingPayload = JSON.stringify({
        storagePath: path,
        durationMs,
        mimeType,
        role: role || undefined,
        interviewType: interviewType || undefined,
        byteSize,
        recordedAt: new Date().toISOString(),
      });

      let savedResult = false;
      try {
        await saveAIToolResult(user.id, 'voice_interview_video', inputSummary, recordingPayload);
        savedResult = true;
      } catch (error) {
        if (!isMissingPrismaEnumValue(error, 'voice_interview_video')) throw error;
        console.warn(
          '[voice-interview/recording] skipping AI history save because database is missing enum value voice_interview_video'
        );
      }

      if (!savedResult) {
        void trackEvent({
          userId: user.id,
          eventName: 'ai_tool_run_completed',
          entityType: 'ai_tool',
          metadata: { tool: 'voice_interview_video', durationMs, byteSize },
          sourcePage: '/dashboard/ai-tools/voice-interview',
        }).catch(() => {});
      }

      const supabase = getSupabaseAdmin();
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);

      return NextResponse.json({
        ok: true,
        path,
        playbackUrl: signed?.signedUrl ?? null,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('voice-interview recording route error:', e);
    const msg =
      e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Server configuration error (Supabase)'
        : 'Failed to process recording';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
