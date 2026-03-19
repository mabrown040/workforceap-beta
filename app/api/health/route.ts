import { NextResponse } from 'next/server';

/** Liveness — no DB; safe for load balancers and uptime monitors. */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ok: true });
}
