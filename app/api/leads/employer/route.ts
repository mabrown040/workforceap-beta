import { NextResponse } from 'next/server';

/** Redirects to Calendly when configured, else /employers intake anchor. */
export async function GET(request: Request) {
  const calendly =
    process.env.NEXT_PUBLIC_EMPLOYER_CALENDLY_URL?.trim() ||
    process.env.EMPLOYER_CALENDLY_URL?.trim();

  if (calendly) {
    return NextResponse.redirect(calendly, 302);
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/employers#employer-intake`, 302);
}
