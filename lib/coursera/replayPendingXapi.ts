import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import { parseXapiStatement } from '@/lib/xapi/statements';
import { markXapiStatementProcessed } from '@/lib/xapi/storage';
import { xapiStatementRowToRawStatement } from '@/lib/xapi/xapiStatementRowToRaw';

export type ReplayPendingXapiResult = {
  scanned: number;
  replayed: number;
  skippedUnparsed: number;
  completionsEmitted: number;
};

/**
 * Drain `xapi_statements` rows still marked unprocessed (e.g. webhook arrived
 * before identity mapping existed, or transient failure after persist).
 */
export async function replayPendingXapiStatements(limit = 150): Promise<ReplayPendingXapiResult> {
  const rows = await prisma.xapiStatement.findMany({
    where: { processed: false },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let replayed = 0;
  let skippedUnparsed = 0;
  let completionsEmitted = 0;

  for (const row of rows) {
    const raw = xapiStatementRowToRawStatement(row);
    const parsed = parseXapiStatement(raw);
    if (!parsed) {
      skippedUnparsed += 1;
      await markXapiStatementProcessed(row.statementId);
      continue;
    }

    replayed += 1;
    const { completions } = await handleInboundParsedStatement(parsed);
    completionsEmitted += completions.length;
  }

  return {
    scanned: rows.length,
    replayed,
    skippedUnparsed,
    completionsEmitted,
  };
}
