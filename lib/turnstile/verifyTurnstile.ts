/** Server-side Turnstile verification (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). */
export async function verifyTurnstileResponse(
  secret: string,
  token: string,
  remoteip?: string
): Promise<boolean> {
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteip) body.set('remoteip', remoteip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
