import { prisma } from '@/lib/db/prisma';
import { isPaidUtmSource, normalizeUtmSource, PAID_UTM_SOURCES } from '@/lib/marketing/paidTrafficSources';

const APPLY_SIGNUP_COMPLETED = 'apply_signup_completed';
const CPA_TARGET_USD = 15;

export type GrowthCampaignRow = {
  campaign: string;
  completions: number;
  placements: number;
  placementValueCents: number;
  spendCents: number;
  cpaUsd: number | null;
  roas: number | null;
  under15Cpa7d: boolean;
};

export type GrowthSourceSection = {
  source: string;
  campaigns: GrowthCampaignRow[];
  totalCompletions: number;
  totalSpendCents: number;
  todaySpendCents: number;
  sparkline: number[];
};

export type GrowthKpis = {
  todayCpaUsd: number | null;
  last7CpaUsd: number | null;
  last30CpaUsd: number | null;
  blendedPaidCpaUsd: number | null;
  organicCompletions30d: number;
};

export type GrowthDashboardData = {
  kpis: GrowthKpis;
  sources: GrowthSourceSection[];
  under15CampaignCount: number;
  refreshedAt: string;
};

type CompletionAggRow = {
  utm_source: string;
  utm_campaign: string;
  completions: number;
};

type PlacementAggRow = {
  utm_source: string;
  utm_campaign: string;
  placements: number;
  placement_value_cents: number;
};

type DailySourceRow = {
  day: Date;
  utm_source: string;
  completions: number;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function cpaFrom(spendCents: number, completions: number): number | null {
  if (completions <= 0 || spendCents <= 0) return null;
  return spendCents / 100 / completions;
}

function roasFrom(spendCents: number, placementValueCents: number): number | null {
  if (spendCents <= 0 || placementValueCents <= 0) return null;
  return placementValueCents / spendCents;
}

async function fetchCompletionsBySourceCampaign(
  orgId: string,
  start: Date,
  end: Date,
): Promise<CompletionAggRow[]> {
  return prisma.$queryRaw<CompletionAggRow[]>`
    SELECT
      LOWER(TRIM(COALESCE(me.metadata->>'utm_source', ''))) AS utm_source,
      TRIM(COALESCE(me.metadata->>'utm_campaign', '')) AS utm_campaign,
      COUNT(*)::int AS completions
    FROM member_events me
    INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId}
    WHERE me.event_name = ${APPLY_SIGNUP_COMPLETED}
      AND me.created_at >= ${start}
      AND me.created_at < ${end}
    GROUP BY 1, 2
  `;
}

async function fetchPlacementsByAttribution(orgId: string): Promise<PlacementAggRow[]> {
  return prisma.$queryRaw<PlacementAggRow[]>`
    WITH first_signup AS (
      SELECT DISTINCT ON (me.user_id)
        me.user_id,
        LOWER(TRIM(COALESCE(me.metadata->>'utm_source', ''))) AS utm_source,
        TRIM(COALESCE(me.metadata->>'utm_campaign', '')) AS utm_campaign
      FROM member_events me
      INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId}
      WHERE me.event_name = ${APPLY_SIGNUP_COMPLETED}
      ORDER BY me.user_id, me.created_at ASC
    )
    SELECT
      fs.utm_source,
      fs.utm_campaign,
      COUNT(pr.id)::int AS placements,
      COALESCE(SUM(pr.salary_offered), 0)::int * 100 AS placement_value_cents
    FROM first_signup fs
    INNER JOIN placement_records pr ON pr.user_id = fs.user_id
    GROUP BY fs.utm_source, fs.utm_campaign
  `;
}

async function fetchDailyCompletionsBySource(
  orgId: string,
  start: Date,
  end: Date,
): Promise<DailySourceRow[]> {
  return prisma.$queryRaw<DailySourceRow[]>`
    SELECT
      DATE(me.created_at AT TIME ZONE 'UTC') AS day,
      LOWER(TRIM(COALESCE(me.metadata->>'utm_source', ''))) AS utm_source,
      COUNT(*)::int AS completions
    FROM member_events me
    INNER JOIN users u ON u.id = me.user_id AND u.organization_id = ${orgId}
    WHERE me.event_name = ${APPLY_SIGNUP_COMPLETED}
      AND me.created_at >= ${start}
      AND me.created_at < ${end}
      AND COALESCE(me.metadata->>'utm_source', '') <> ''
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `;
}

async function fetchSpendBySourceCampaign(
  orgId: string,
  start: Date,
  end: Date,
): Promise<{ source: string; campaign: string; cents: number }[]> {
  const rows = await prisma.adSpendDay.findMany({
    where: {
      organizationId: orgId,
      date: { gte: start, lt: end },
    },
    select: { source: true, campaign: true, cents: true },
  });
  return rows.map((r) => ({
    source: normalizeUtmSource(r.source),
    campaign: r.campaign.trim(),
    cents: r.cents,
  }));
}

async function fetchTodaySpendBySource(orgId: string, today: Date): Promise<Map<string, number>> {
  const rows = await prisma.adSpendDay.findMany({
    where: {
      organizationId: orgId,
      date: today,
      campaign: '',
    },
    select: { source: true, cents: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(normalizeUtmSource(row.source), row.cents);
  }
  return map;
}

function sumPaidCompletionsAndSpend(
  completions: CompletionAggRow[],
  spendRows: { source: string; campaign: string; cents: number }[],
): { completions: number; spendCents: number } {
  let totalCompletions = 0;
  let totalSpendCents = 0;

  for (const row of completions) {
    if (!isPaidUtmSource(row.utm_source)) continue;
    totalCompletions += row.completions;
  }

  for (const row of spendRows) {
    if (!isPaidUtmSource(row.source)) continue;
    totalSpendCents += row.cents;
  }

  return { completions: totalCompletions, spendCents: totalSpendCents };
}

function buildSparkline(
  dailyRows: DailySourceRow[],
  source: string,
  start: Date,
  days: number,
): number[] {
  const byDay = new Map<string, number>();
  for (const row of dailyRows) {
    if (row.utm_source !== source) continue;
    const key = formatUtcDate(new Date(row.day));
    byDay.set(key, (byDay.get(key) ?? 0) + row.completions);
  }

  const points: number[] = [];
  for (let i = 0; i < days; i++) {
    const day = addUtcDays(start, i);
    points.push(byDay.get(formatUtcDate(day)) ?? 0);
  }
  return points;
}

export async function getGrowthDashboardData(orgId: string): Promise<GrowthDashboardData> {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const last7Start = addUtcDays(todayStart, -7);
  const last30Start = addUtcDays(todayStart, -30);

  const [
    completionsToday,
    completions7d,
    completions30d,
    placementsByAttr,
    daily30d,
    spendToday,
    spend7d,
    spend30d,
    todaySpendBySource,
  ] = await Promise.all([
    fetchCompletionsBySourceCampaign(orgId, todayStart, tomorrowStart),
    fetchCompletionsBySourceCampaign(orgId, last7Start, tomorrowStart),
    fetchCompletionsBySourceCampaign(orgId, last30Start, tomorrowStart),
    fetchPlacementsByAttribution(orgId),
    fetchDailyCompletionsBySource(orgId, last30Start, tomorrowStart),
    fetchSpendBySourceCampaign(orgId, todayStart, tomorrowStart),
    fetchSpendBySourceCampaign(orgId, last7Start, tomorrowStart),
    fetchSpendBySourceCampaign(orgId, last30Start, tomorrowStart),
    fetchTodaySpendBySource(orgId, todayStart),
  ]);

  const paidToday = sumPaidCompletionsAndSpend(completionsToday, spendToday);
  const paid7d = sumPaidCompletionsAndSpend(completions7d, spend7d);
  const paid30d = sumPaidCompletionsAndSpend(completions30d, spend30d);

  let organicCompletions30d = 0;
  for (const row of completions30d) {
    if (!isPaidUtmSource(row.utm_source)) {
      organicCompletions30d += row.completions;
    }
  }

  const placementMap = new Map<string, PlacementAggRow>();
  for (const p of placementsByAttr) {
    placementMap.set(`${p.utm_source}\0${p.utm_campaign}`, p);
  }

  const spend30Map = new Map<string, number>();
  const spend7Map = new Map<string, number>();
  for (const s of spend30d) {
    const key = `${s.source}\0${s.campaign}`;
    spend30Map.set(key, (spend30Map.get(key) ?? 0) + s.cents);
  }
  for (const s of spend7d) {
    const key = `${s.source}\0${s.campaign}`;
    spend7Map.set(key, (spend7Map.get(key) ?? 0) + s.cents);
  }

  const completion30Map = new Map<string, number>();
  const completion7Map = new Map<string, number>();
  for (const c of completions30d) {
    if (!isPaidUtmSource(c.utm_source)) continue;
    const key = `${c.utm_source}\0${c.utm_campaign}`;
    completion30Map.set(key, (completion30Map.get(key) ?? 0) + c.completions);
  }
  for (const c of completions7d) {
    if (!isPaidUtmSource(c.utm_source)) continue;
    const key = `${c.utm_source}\0${c.utm_campaign}`;
    completion7Map.set(key, (completion7Map.get(key) ?? 0) + c.completions);
  }

  const sources: GrowthSourceSection[] = [];
  let under15CampaignCount = 0;

  for (const paidSource of PAID_UTM_SOURCES) {
    const campaignKeys = new Set<string>();
    for (const c of completions30d) {
      if (c.utm_source === paidSource) campaignKeys.add(c.utm_campaign);
    }
    for (const key of spend30Map.keys()) {
      const [src, camp] = key.split('\0');
      if (src === paidSource) campaignKeys.add(camp);
    }

    const campaigns: GrowthCampaignRow[] = [];
    let totalCompletions = 0;
    let totalSpendCents = 0;

    for (const campaign of [...campaignKeys].sort((a, b) => a.localeCompare(b))) {
      const key = `${paidSource}\0${campaign}`;
      const completions = completion30Map.get(key) ?? 0;
      const spendCents = spend30Map.get(key) ?? 0;
      const completions7dCount = completion7Map.get(key) ?? 0;
      const spendCents7d = spend7Map.get(key) ?? 0;
      const placement = placementMap.get(key);
      const placements = placement?.placements ?? 0;
      const placementValueCents = placement?.placement_value_cents ?? 0;
      const cpaUsd = cpaFrom(spendCents, completions);
      const roas = roasFrom(spendCents, placementValueCents);
      const cpa7d = cpaFrom(spendCents7d, completions7dCount);
      const under15Cpa7d = cpa7d != null && cpa7d < CPA_TARGET_USD && completions7dCount > 0;

      if (under15Cpa7d) under15CampaignCount += 1;

      totalCompletions += completions;
      totalSpendCents += spendCents;

      campaigns.push({
        campaign: campaign || '(not set)',
        completions,
        placements,
        placementValueCents,
        spendCents,
        cpaUsd,
        roas,
        under15Cpa7d,
      });
    }

    sources.push({
      source: paidSource,
      campaigns,
      totalCompletions,
      totalSpendCents,
      todaySpendCents: todaySpendBySource.get(paidSource) ?? 0,
      sparkline: buildSparkline(daily30d, paidSource, last30Start, 30),
    });
  }

  return {
    kpis: {
      todayCpaUsd: cpaFrom(paidToday.spendCents, paidToday.completions),
      last7CpaUsd: cpaFrom(paid7d.spendCents, paid7d.completions),
      last30CpaUsd: cpaFrom(paid30d.spendCents, paid30d.completions),
      blendedPaidCpaUsd: cpaFrom(paid30d.spendCents, paid30d.completions),
      organicCompletions30d,
    },
    sources,
    under15CampaignCount,
    refreshedAt: now.toISOString(),
  };
}

export { CPA_TARGET_USD };

export async function upsertSourceDailySpend(params: {
  organizationId: string;
  source: string;
  date: Date;
  cents: number;
}): Promise<void> {
  const source = normalizeUtmSource(params.source);
  if (!isPaidUtmSource(source)) {
    throw new Error('Invalid paid traffic source');
  }
  if (params.cents < 0) {
    throw new Error('Spend cannot be negative');
  }

  await prisma.adSpendDay.upsert({
    where: {
      organizationId_source_campaign_date: {
        organizationId: params.organizationId,
        source,
        campaign: '',
        date: params.date,
      },
    },
    create: {
      organizationId: params.organizationId,
      source,
      campaign: '',
      date: params.date,
      cents: params.cents,
    },
    update: { cents: params.cents },
  });
}
