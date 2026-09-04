import type { Prisma } from '@prisma/client';

/**
 * Next human invoice number for an organization: PREFIX-YYYY-NNNN, counting
 * packets created this calendar year. The (organizationId, packetNumber)
 * unique index catches a race; callers retry on P2002.
 */
export async function nextPacketNumber(
  tx: Prisma.TransactionClient,
  args: { organizationId: string; prefix: string; now?: Date },
): Promise<string> {
  const now = args.now ?? new Date();
  const year = now.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYear = new Date(Date.UTC(year + 1, 0, 1));
  const count = await tx.trainingBillingPacket.count({
    where: { organizationId: args.organizationId, createdAt: { gte: yearStart, lt: nextYear } },
  });
  return formatPacketNumber(args.prefix, year, count + 1);
}

export function formatPacketNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === 'P2002');
}
