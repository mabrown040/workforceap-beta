import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = 'agent_2801kmznvsemfmms06r0e02es1b9';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'Voice sessions are not configured' }, { status: 503 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
    { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('ElevenLabs signed URL error:', res.status, text);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 502 });
  }

  const data = await res.json() as { signed_url: string };
  return NextResponse.json({ signedUrl: data.signed_url });
}
