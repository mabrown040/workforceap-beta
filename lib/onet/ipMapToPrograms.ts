import { prisma } from '@/lib/db/prisma';
import { LOOKUP_CATALOG_CAP } from '@/lib/db/scanCaps';
import { getProgramBySlug } from '@/lib/content/programs';

const FIT_WEIGHT: Record<string, number> = {
  Best: 4,
  Great: 2.2,
  Good: 1,
};

/** Map Interest Profiler career rows (O*NET-SOC codes) to WorkforceAP program slugs using admin career mappings. */
export async function mapIpCareerRowsToProgramSlugs(
  careers: { code: string; fit?: string }[]
): Promise<string[]> {
  if (careers.length === 0) return [];
  const codes = [...new Set(careers.map((c) => c.code.trim()).filter(Boolean))];
  const mappings = await prisma.careerProgramMapping.findMany({
    take: LOOKUP_CATALOG_CAP,
    where: { isActive: true, onetCode: { in: codes } },
  });
  if (mappings.length === 0) return [];

  const scoreBySlug = new Map<string, number>();
  for (const c of careers) {
    const fit = FIT_WEIGHT[c.fit ?? ''] ?? 1;
    const forCode = mappings.filter((m) => m.onetCode === c.code);
    for (const m of forCode) {
      const pri = m.priority <= 0 ? 1 : 1 / m.priority;
      const add = fit * pri;
      scoreBySlug.set(m.programSlug, (scoreBySlug.get(m.programSlug) ?? 0) + add);
    }
  }

  const ranked = [...scoreBySlug.entries()].sort((a, b) => b[1] - a[1]);
  return ranked.map(([slug]) => slug).filter((s) => getProgramBySlug(s));
}
