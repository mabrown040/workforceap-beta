import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { buildPublicWioaPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';

const payloadSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  countyOrZip: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid voice session payload' }, { status: 400 });
  }

  try {
    const dynamicVariables = buildPublicWioaPortalDynamicVariables(parsed.data);
    const { signedUrl, expiresAt, dynamicVariables: returned } = await startElevenLabsPortalSession('wioa_prequal', {
      dynamicVariables,
    });

    return NextResponse.json({
      signedUrl,
      expiresAt,
      dynamicVariables: returned ?? dynamicVariables,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start session';
    console.error('[public/wioa-qualification/voice-session]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
