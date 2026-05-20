import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export async function verifyOverrideSignature(exp: string, signature: string): Promise<boolean> {
  const secret = process.env.EXPERIMENT_OVERRIDE_SECRET;
  if (!secret || !signature) return false;
  try {
    const expected = createHmac('sha256', secret).update(exp).digest('hex');
    const provided = signature.toLowerCase();
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
  } catch {
    return false;
  }
}

export async function signExperimentOverride(exp: string): Promise<string | null> {
  const secret = process.env.EXPERIMENT_OVERRIDE_SECRET;
  if (!secret) return null;
  try {
    return createHmac('sha256', secret).update(exp).digest('hex');
  } catch {
    return null;
  }
}
