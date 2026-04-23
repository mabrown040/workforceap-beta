// Auto-generated Coursera webhook handler — night shift build
import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({ received: true, body });
}
