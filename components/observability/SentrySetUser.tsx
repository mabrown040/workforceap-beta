'use client';

import { useEffect } from 'react';
import { setSentryUser } from '@/instrumentation-client';

/**
 * Syncs the authenticated user's ID onto the client-side Sentry scope so
 * client-side errors (e.g. login, dashboard/account, messages) are tagged
 * with a user, letting on-call triage tell "one user retry-storming" apart
 * from a broad outage. ID ONLY — never email, name, or other PII.
 *
 * Mounted in app/layout.tsx with the userId the root layout already
 * resolved server-side (via the verified `x-wap-user-id` header / getUser()).
 * Calls Sentry.setUser(null) when userId becomes null (e.g. after logout,
 * once the layout re-renders with no session).
 */
export default function SentrySetUser({ userId }: { userId: string | null }) {
  useEffect(() => {
    setSentryUser(userId).catch(() => {
      // Never let Sentry plumbing itself break the page.
    });
  }, [userId]);

  return null;
}
