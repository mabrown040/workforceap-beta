import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { sendMilestoneCascadeEmail } from '@/lib/email';

import type { ActionDraft } from './types';

/**
 * Per-draft outbound dispatcher.
 *
 * Pilot scope:
 *   - celebrate_milestone → actually send the email via Resend.
 *   - everything else      → log only (counselor sees the rationale in the
 *                            inbox and acts on it manually — auto-enrollment
 *                            and auto-pairing are explicitly out of pilot
 *                            scope per the spec's safety rails).
 *
 * Never throws. Returns a per-draft outcome the caller can persist for the
 * audit trail.
 */

export type DraftDispatchOutcome =
  | { ok: true; kind: 'sent_email' }
  | { ok: true; kind: 'logged_only'; reason: string }
  | { ok: false; reason: string };

export async function dispatchApprovedDraft(args: {
  draft: ActionDraft;
  recipientEmail: string;
}): Promise<DraftDispatchOutcome> {
  const { draft, recipientEmail } = args;

  if (draft.type === 'celebrate_milestone') {
    const result = await sendMilestoneCascadeEmail({
      to: recipientEmail,
      subject: draft.subject,
      bodyText: draft.body,
    });
    if (!result.ok) {
      return { ok: false, reason: result.error ?? 'send failed' };
    }
    return { ok: true, kind: 'sent_email' };
  }

  // The other three action types are advisory in the pilot — they appear in
  // the counselor's view of the cascade and the counselor acts on them
  // manually (enroll the next course, message a peer, schedule a call).
  // Auto-enrollment and auto-pairing land in a follow-up PR once we trust
  // the LLM's suggestion quality on real cascades.
  return { ok: true, kind: 'logged_only', reason: `advisory action: ${draft.type}` };
}

/**
 * Dispatch all approved drafts on a cascade. Used by the approve endpoint
 * after status has been moved to `approved`.
 *
 * After all drafts are processed, the cascade is transitioned to `sent` so
 * it leaves the awaiting_approval queue and the audit trail records that an
 * outbound pass completed.
 */
export interface DispatchAllResult {
  outcomes: Array<{ draftIndex: number; type: ActionDraft['type']; outcome: DraftDispatchOutcome }>;
  emailsSent: number;
  emailsFailed: number;
  advisoryCount: number;
}

export async function dispatchApprovedCascade(args: {
  cascadeId: string;
  drafts: ActionDraft[];
  recipientEmail: string;
}): Promise<DispatchAllResult> {
  const result: DispatchAllResult = {
    outcomes: [],
    emailsSent: 0,
    emailsFailed: 0,
    advisoryCount: 0,
  };

  for (let i = 0; i < args.drafts.length; i++) {
    const draft = args.drafts[i];
    const outcome = await dispatchApprovedDraft({
      draft,
      recipientEmail: args.recipientEmail,
    });

    result.outcomes.push({ draftIndex: i, type: draft.type, outcome });

    if (outcome.ok && outcome.kind === 'sent_email') result.emailsSent += 1;
    else if (outcome.ok && outcome.kind === 'logged_only') result.advisoryCount += 1;
    else if (!outcome.ok) result.emailsFailed += 1;
  }

  // Transition to `sent` regardless of per-draft email failures — the
  // counselor's "Approve" action has been taken, so the row should leave
  // the awaiting_approval queue. Email failures are captured in the
  // outcomes array and surfaced in the response so the counselor can retry
  // a specific draft if needed (retry logic is v2; pilot just reports).
  await prisma.milestoneCascade
    .update({
      where: { id: args.cascadeId },
      data: { sentAt: new Date(), status: 'sent' },
    })
    .catch((err) => {
      console.error(
        '[milestone-cascade] failed to mark cascade as sent after dispatch:',
        err,
      );
    });

  return result;
}
