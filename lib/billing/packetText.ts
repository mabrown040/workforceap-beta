import type { PacketLineItem } from './packetSchema';

/**
 * Client-safe helpers shared by the admin form, the PDF renderer and the
 * emails. No Prisma, no syllabus data, so the browser bundle stays small.
 */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function formatLongDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(`${iso.slice(0, 10)}T12:00:00Z`) : iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function totalContactHours(items: ReadonlyArray<PacketLineItem>): number {
  return items.reduce((sum, item) => sum + (item.hours ?? 0), 0);
}

/**
 * Split `total` across `weights` proportionally, in whole cents, so the rows
 * always add back up to the total. Any rounding remainder lands on the last
 * row with a positive weight. Zero-weight rows (a class with no hours on
 * file) share the total equally instead of getting $0.
 */
export function allocateAmount(total: number, weights: ReadonlyArray<number>): number[] {
  if (weights.length === 0) return [];
  const totalCents = Math.round(total * 100);
  const positive = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const weightSum = positive.reduce((a, b) => a + b, 0);
  const effective = weightSum > 0 ? positive : weights.map(() => 1);
  const effectiveSum = weightSum > 0 ? weightSum : weights.length;

  const cents = effective.map((w) => Math.floor((totalCents * w) / effectiveSum));
  let remainder = totalCents - cents.reduce((a, b) => a + b, 0);
  for (let i = effective.length - 1; i >= 0 && remainder > 0; i--) {
    if (effective[i] > 0) {
      cents[i] += remainder;
      remainder = 0;
    }
  }
  return cents.map((c) => c / 100);
}

/**
 * Default J6 body. Plain paragraphs separated by blank lines; the admin edits
 * it on the form before signing. Keep the wording board-facing and factual.
 */
export function defaultCoverLetterBody(args: {
  memberName: string;
  programTitle: string;
  billToName: string;
  lineItems: ReadonlyArray<PacketLineItem>;
  providerName: string;
  referenceNumber?: string;
}): string {
  const classes = args.lineItems.filter((row) => row.hours != null);
  const hours = totalContactHours(args.lineItems);
  const total = args.lineItems.reduce((sum, row) => sum + row.amount, 0);
  const classList = classes.length
    ? classes.map((row) => `- ${row.description}${row.hours ? ` (${row.hours} contact hours)` : ''}`).join('\n')
    : `- ${args.programTitle}`;
  const reference = args.referenceNumber ? ` under reference ${args.referenceNumber}` : '';

  return [
    `Please find enclosed the training invoice (Form J5) from ${args.providerName} for ${args.memberName}, who is enrolled in the ${args.programTitle} program${reference}.`,
    `The invoice covers the following classes${hours ? ` (${hours} total contact hours)` : ''}:\n${classList}`,
    `The total amount due is ${formatMoney(total)}. A class-by-class price breakdown appears on the invoice. Training is provided at no cost to the participant; this invoice is billed to ${args.billToName} as the funding partner.`,
    `Thank you for your partnership in advancing this participant's career. Please contact me directly with any questions about this enrollment or invoice.`,
  ].join('\n\n');
}

/** Today (UTC) as YYYY-MM-DD, with an optional day offset. */
export function isoDatePlusDays(days: number, from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
}
