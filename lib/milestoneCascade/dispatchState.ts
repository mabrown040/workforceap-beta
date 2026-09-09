import { z } from 'zod';

// Resend retains keys for 24h. Leave one hour for clock/network uncertainty.
export const CASCADE_IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60 * 1000;
export const CASCADE_DISPATCH_LEASE_MS = 5 * 60 * 1000;

const entrySchema = z.object({
  draftIndex: z.number().int().nonnegative(),
  type: z.string(),
  status: z.enum(['pending', 'sending', 'accepted', 'failed', 'advisory']),
  idempotencyKey: z.string().min(1).max(256),
  attempts: z.number().int().nonnegative(),
  firstAttemptAt: z.string().datetime().nullable(),
  lastAttemptAt: z.string().datetime().nullable(),
  providerMessageId: z.string().nullable(),
  error: z.string().nullable(),
}).superRefine((entry, ctx) => {
  const untouched = entry.status === 'pending' || entry.status === 'advisory';
  if (untouched && (entry.attempts !== 0 || entry.firstAttemptAt !== null || entry.lastAttemptAt !== null || entry.providerMessageId !== null)) {
    ctx.addIssue({ code: 'custom', message: 'Unattempted entries cannot contain send history.' });
  }
  if (!untouched && (entry.attempts < 1 || !entry.firstAttemptAt || !entry.lastAttemptAt || new Date(entry.firstAttemptAt) > new Date(entry.lastAttemptAt))) {
    ctx.addIssue({ code: 'custom', message: 'Attempted entries require valid ordered timestamps.' });
  }
  if ((entry.status === 'accepted') !== Boolean(entry.providerMessageId?.trim())) {
    ctx.addIssue({ code: 'custom', message: 'Only accepted entries carry a provider receipt.' });
  }
});
export const CascadeDispatchStateSchema = z.object({
  version: z.literal(1),
  recipientEmail: z.string().email(),
  draftHash: z.string().regex(/^[a-f0-9]{64}$/),
  claimId: z.string().nullable(),
  leaseUntil: z.string().datetime().nullable(),
  entries: z.array(entrySchema).min(1).max(5),
}).superRefine((state, ctx) => {
  if (Boolean(state.claimId) !== Boolean(state.leaseUntil)) ctx.addIssue({ code: 'custom', message: 'A dispatch claim requires a lease.' });
  if (state.entries.some((entry, index) => entry.draftIndex !== index)) ctx.addIssue({ code: 'custom', message: 'Draft indices must be complete and ordered.' });
});
export type CascadeDispatchState = z.infer<typeof CascadeDispatchStateSchema>;
export type CascadeDispatchEntry = CascadeDispatchState['entries'][number];
export type CascadeDispatchSummary = {
  accepted: number; failed: number; uncertain: number; pending: number; advisory: number;
  canRetry: boolean; canFinalize: boolean; retryAfter: string | null; blockedReason: string | null;
};

export function summarizeCascadeDispatch(raw: unknown, now = new Date()): CascadeDispatchSummary {
  const parsed = CascadeDispatchStateSchema.safeParse(raw);
  const summary: CascadeDispatchSummary = { accepted: 0, failed: 0, uncertain: 0, pending: 0, advisory: 0, canRetry: false, canFinalize: false, retryAfter: null, blockedReason: null };
  if (!parsed.success) return { ...summary, blockedReason: 'No valid delivery record is available. Staff reconciliation is required before another send.' };
  const state = parsed.data;
  for (const entry of state.entries) {
    if (entry.status === 'sending') summary.uncertain++;
    else summary[entry.status]++;
  }
  const remaining = state.entries.filter(e => e.status !== 'accepted' && e.status !== 'advisory');
  if (!remaining.length) {
    if (state.claimId && state.leaseUntil && new Date(state.leaseUntil) > now) {
      summary.retryAfter = state.leaseUntil;
      summary.blockedReason = 'A delivery record update is in progress. Reload after it finishes.';
    } else summary.canFinalize = true;
    return summary;
  }
  if (state.entries.some(e => e.firstAttemptAt && (new Date(e.firstAttemptAt) > now || new Date(e.lastAttemptAt!) > now))) {
    summary.blockedReason = 'Delivery timestamps cannot be verified. Staff reconciliation is required.';
    return summary;
  }
  if (remaining.some(e => e.firstAttemptAt && now.getTime() >= new Date(e.firstAttemptAt).getTime() + CASCADE_IDEMPOTENCY_WINDOW_MS)) {
    summary.blockedReason = 'The safe retry window has ended. Staff must reconcile provider delivery before sending again.';
    return summary;
  }
  if (state.claimId && state.leaseUntil && new Date(state.leaseUntil).getTime() > now.getTime()) {
    summary.retryAfter = state.leaseUntil;
    summary.blockedReason = 'A delivery attempt is in progress. Reload after it finishes.';
    return summary;
  }
  summary.canRetry = true;
  return summary;
}
