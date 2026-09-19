import { z } from 'zod';

const statementTimestamp = z.string().datetime({ offset: true });

/** xAPI timestamp is learner event time; stored/received time is never a fallback. */
export function xapiLearnerActivityAt(value: unknown, now: Date = new Date()): Date | null {
  const parsed = statementTimestamp.safeParse(value);
  if (!parsed.success) return null;
  const timestamp = new Date(parsed.data);
  const milliseconds = timestamp.getTime();
  return Number.isFinite(milliseconds) && milliseconds >= Date.UTC(2000, 0, 1)
    && milliseconds <= now.getTime() ? timestamp : null;
}
