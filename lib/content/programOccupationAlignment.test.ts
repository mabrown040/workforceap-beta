import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  REVISED_PROGRAM_OCCUPATION_ALIGNMENT,
} from './programOccupationAlignment';
import {
  findBridgeOccupation,
  getBridgeOccupationById,
} from './trainingBridge';
import {
  OBSOLETE_REVISED_PROGRAM_MAPPINGS,
  seedOnetCareerData,
} from '../../prisma/seed-onet-career';

test('keeps board classifications while routing current O*NET codes correctly', () => {
  const { managementAnalyst, databaseAdministrator } =
    REVISED_PROGRAM_OCCUPATION_ALIGNMENT;

  assert.deepEqual(managementAnalyst.board, {
    primaryOnetSocCode: '13-1111.00',
    secondaryOnetSocCodes: ['13-1161.00'],
  });
  assert.deepEqual(databaseAdministrator.board, {
    primaryOnetSocCode: '15-1245.00',
    secondaryOnetSocCodes: ['15-1243.00'],
  });
  assert.deepEqual(databaseAdministrator.operational, {
    primaryOnetSocCode: '15-1242.00',
    secondaryOnetSocCodes: ['15-1243.00'],
  });
  assert.equal(
    databaseAdministrator.boardToOperationalCode['15-1245.00'],
    '15-1242.00',
  );

  assert.equal(findBridgeOccupation('13-1111.00', null)?.id, 'management-analyst');
  assert.equal(
    findBridgeOccupation('13-1161.00', null)?.id,
    'digital-marketing-specialist',
  );
  assert.equal(
    findBridgeOccupation(null, 'Market Research Analyst')?.id,
    'digital-marketing-specialist',
  );
  assert.equal(findBridgeOccupation('15-1242.00', null)?.id, 'database-administrator');
  assert.equal(findBridgeOccupation('15-1245.00', null)?.id, 'database-administrator');
  assert.equal(findBridgeOccupation('15-1243.00', null)?.id, 'database-administrator');

  assert.deepEqual(getBridgeOccupationById('management-analyst')?.boardClassification, {
    primaryOnetSocCode: '13-1111.00',
    secondaryOnetSocCodes: ['13-1161.00'],
  });
});

type MappingRow = {
  id: string;
  onetCode: string;
  programSlug: string;
  experienceBand: string;
  priority?: number;
  recommendationType?: string;
  whyRecommended?: string;
  isActive?: boolean;
};

test('seed atomically removes only obsolete revised-program mappings and is repeatable', async () => {
  const managementSlug =
    REVISED_PROGRAM_OCCUPATION_ALIGNMENT.managementAnalyst.programSlug;
  const dbaSlug =
    REVISED_PROGRAM_OCCUPATION_ALIGNMENT.databaseAdministrator.programSlug;
  let nextId = 10;
  let transactionCalls = 0;
  const seededOccupationCodes: string[] = [];
  let rows: MappingRow[] = [
    {
      id: 'legacy-management-data-science',
      onetCode: '15-2051.00',
      programSlug: managementSlug,
      experienceBand: 'some_experience',
    },
    {
      id: 'legacy-dba-board-code',
      onetCode: '15-1245.00',
      programSlug: dbaSlug,
      experienceBand: 'some_experience',
    },
    {
      id: 'unrelated-same-code',
      onetCode: '15-1245.00',
      programSlug: 'admin-curated-unrelated-program',
      experienceBand: 'experienced',
    },
  ];

  const careerProgramMapping = {
    deleteMany: async ({ where }: { where: { OR: Array<Pick<MappingRow, 'programSlug' | 'onetCode'>> } }) => {
      const before = rows.length;
      rows = rows.filter(
        (row) =>
          !where.OR.some(
            (candidate) =>
              candidate.programSlug === row.programSlug &&
              candidate.onetCode === row.onetCode,
          ),
      );
      return { count: before - rows.length };
    },
    findFirst: async ({ where }: { where: Pick<MappingRow, 'onetCode' | 'programSlug' | 'experienceBand'> }) =>
      rows.find(
        (row) =>
          row.onetCode === where.onetCode &&
          row.programSlug === where.programSlug &&
          row.experienceBand === where.experienceBand,
      ) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<MappingRow> }) => {
      const index = rows.findIndex((row) => row.id === where.id);
      rows[index] = { ...rows[index], ...data };
      return rows[index];
    },
    create: async ({ data }: { data: Omit<MappingRow, 'id'> }) => {
      const row = { id: `created-${nextId++}`, ...data };
      rows.push(row);
      return row;
    },
  };

  const prisma = {
    onetOccupation: {
      upsert: async ({ where }: { where: { onetCode: string } }) => {
        seededOccupationCodes.push(where.onetCode);
        return where;
      },
    },
    careerQuizRule: { upsert: async () => ({}) },
    $transaction: async <T>(callback: (tx: { careerProgramMapping: typeof careerProgramMapping }) => Promise<T>) => {
      transactionCalls += 1;
      return callback({ careerProgramMapping });
    },
  } as unknown as PrismaClient;

  await seedOnetCareerData(prisma);
  await seedOnetCareerData(prisma);

  assert.equal(transactionCalls, 2);
  assert.ok(seededOccupationCodes.includes('15-1242.00'));
  assert.ok(!seededOccupationCodes.includes('15-1245.00'));
  assert.deepEqual(
    rows
      .filter((row) => row.programSlug === managementSlug)
      .map((row) => row.onetCode)
      .sort(),
    ['13-1111.00', '13-1161.00'],
  );
  assert.deepEqual(
    rows
      .filter((row) => row.programSlug === dbaSlug)
      .map((row) => row.onetCode)
      .sort(),
    ['15-1242.00', '15-1243.00'],
  );
  assert.equal(
    rows.filter((row) => row.id === 'unrelated-same-code').length,
    1,
  );

  for (const obsolete of OBSOLETE_REVISED_PROGRAM_MAPPINGS) {
    assert.equal(
      rows.some(
        (row) =>
          row.programSlug === obsolete.programSlug &&
          row.onetCode === obsolete.onetCode,
      ),
      false,
    );
  }
});
