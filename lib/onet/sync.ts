import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { ONET_SYNC_OCCUPATION_CAP } from '@/lib/db/scanCaps';
import {
  getOccupation,
  getOccupationAbilities,
  getOccupationEducation,
  getOccupationKnowledge,
  getOccupationSampleTitles,
  getOccupationSkills,
  getOccupationTasks,
  getOccupationTechnology,
  getOccupationWorkActivities,
  getRelatedOccupations,
  isOnetConfigured,
} from '@/lib/onet/client';

export async function syncOccupation(onetCode: string): Promise<{ ok: boolean; error?: string }> {
  if (!isOnetConfigured()) {
    return { ok: false, error: 'ONET_API_KEY not configured' };
  }
  const code = onetCode.trim();
  try {
    await syncOccupationBundle(code);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

async function ensureOccupationStub(tx: Prisma.TransactionClient, onetCode: string, title: string): Promise<void> {
  await tx.onetOccupation.upsert({
    where: { onetCode },
    create: {
      onetCode,
      title: title || onetCode,
      isActive: true,
    },
    update: { title: title || undefined },
  });
}

/** Fetch O*NET API and upsert occupation + child tables. */
export async function syncOccupationBundle(onetCode: string): Promise<void> {
  if (!isOnetConfigured()) {
    throw new Error('ONET_API_KEY not configured');
  }
  const code = onetCode.trim();
  const overview = await getOccupation(code);
  if (!overview) {
    throw new Error(`Occupation not found: ${code}`);
  }

  const [skills, tasks, tech, related, abilities, knowledge, workActivities, education, sampleTitles] = await Promise.all([
    getOccupationSkills(code),
    getOccupationTasks(code),
    getOccupationTechnology(code),
    getRelatedOccupations(code),
    getOccupationAbilities(code),
    getOccupationKnowledge(code),
    getOccupationWorkActivities(code),
    getOccupationEducation(code),
    getOccupationSampleTitles(code),
  ]);

  const rawBundle = { overview, skills, tasks, tech, related, abilities, knowledge, workActivities, education, sampleTitles };

  await prisma.$transaction(async (tx) => {
    await tx.onetOccupation.upsert({
      where: { onetCode: code },
      create: {
        onetCode: code,
        title: overview.title,
        description: overview.description ?? null,
        brightOutlook: overview.tags?.bright_outlook ?? null,
        rawJson: rawBundle as object,
        isActive: true,
      },
      update: {
        title: overview.title,
        description: overview.description ?? null,
        brightOutlook: overview.tags?.bright_outlook ?? null,
        rawJson: rawBundle as object,
      },
    });

    await tx.onetOccupationSkill.deleteMany({ where: { onetCode: code } });
    await tx.onetOccupationTask.deleteMany({ where: { onetCode: code } });
    await tx.onetOccupationTech.deleteMany({ where: { onetCode: code } });
    await tx.onetRelatedOccupation.deleteMany({ where: { onetCode: code } });

    for (const s of skills) {
      await tx.onetOccupationSkill.create({
        data: {
          id: randomUUID(),
          onetCode: code,
          skillName: s.name,
          importance: s.importance,
          level: s.level,
        },
      });
    }

    for (const t of tasks) {
      if (!t.text?.trim()) continue;
      await tx.onetOccupationTask.create({
        data: {
          id: randomUUID(),
          onetCode: code,
          taskText: t.text.trim(),
          importance: t.importance,
        },
      });
    }

    for (const t of tech) {
      if (!t.name?.trim()) continue;
      await tx.onetOccupationTech.create({
        data: {
          id: randomUUID(),
          onetCode: code,
          technologyName: t.name.trim(),
          category: t.category,
        },
      });
    }

    for (const r of related) {
      await ensureOccupationStub(tx, r.code, r.title);
      await tx.onetRelatedOccupation.create({
        data: {
          id: randomUUID(),
          onetCode: code,
          relatedOnetCode: r.code,
          relationshipType: 'related',
        },
      });
    }
  });
}

/**
 * Refresh the next stale slice of mapped O*NET occupations.
 *
 * Hard-capped at `ONET_SYNC_OCCUPATION_CAP` per run. Ordered by
 * `onet_occupations.updated_at ASC NULLS FIRST` so never-synced / oldest
 * codes go first; the next cron or admin click continues with whatever is
 * now the stalest. Does not hydrate the full mapping table.
 */
export async function syncTopMappedOccupations(): Promise<{
  synced: number;
  errors: string[];
  attempted: number;
  remaining: boolean;
}> {
  const rows = await prisma.$queryRaw<Array<{ onet_code: string }>>`
    SELECT m.onet_code
    FROM career_program_mappings m
    LEFT JOIN onet_occupations o ON o.onet_code = m.onet_code
    WHERE m.is_active = true
    GROUP BY m.onet_code
    ORDER BY MIN(o.updated_at) ASC NULLS FIRST, m.onet_code ASC
    LIMIT ${ONET_SYNC_OCCUPATION_CAP}
  `;
  const errors: string[] = [];
  let synced = 0;
  for (const { onet_code: onetCode } of rows) {
    const r = await syncOccupation(onetCode);
    if (r.ok) synced++;
    else if (r.error) errors.push(`${onetCode}: ${r.error}`);
  }
  return {
    synced,
    errors,
    attempted: rows.length,
    remaining: rows.length >= ONET_SYNC_OCCUPATION_CAP,
  };
}
