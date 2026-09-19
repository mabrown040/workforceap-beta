/**
 * /api/careers/occupation/[onetCode]: `mappedPrograms[].programTitle` is a
 * human title, never a raw hyphenated key, even when the mapping row points at
 * a slug the catalog does not know. Legacy alias keys resolve to the current
 * catalog title. `programSlug` stays the stored slug.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (fn: unknown) => fn }));
vi.mock('@/lib/rate-limit', () => ({ checkPublicCareersGetRateLimit: vi.fn(async () => ({ success: true })) }));
vi.mock('@/lib/http/clientIp', () => ({ getClientIpFromRequest: () => '127.0.0.1' }));
vi.mock('@/lib/db/prisma', () => {
  const onetOccupation = { findUnique: vi.fn(), findMany: vi.fn(async () => []) };
  return {
    prisma: {
      onetOccupation,
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ onetOccupation })),
    },
  };
});

import { GET } from '@/app/api/careers/occupation/[onetCode]/route';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

const CODE = '15-1232.00';
const mapping = (programSlug: string, priority: number) => ({
  programSlug,
  priority,
  experienceBand: 'entry',
  recommendationType: 'primary',
  whyRecommended: null,
  isActive: true,
});

describe('GET /api/careers/occupation/[onetCode] — program titles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns humanised / catalog titles, never the raw slug', async () => {
    vi.mocked(prisma.onetOccupation.findUnique).mockResolvedValue({
      onetCode: CODE,
      title: 'Computer User Support Specialists',
      description: null,
      jobFamily: null,
      brightOutlook: false,
      educationLevel: null,
      outlookSummary: null,
      salaryLow: null,
      salaryMedian: null,
      salaryHigh: null,
      skills: [],
      tasks: [],
      relatedFrom: [],
      programMappings: [
        mapping('google-it-support-certificate', 1),
        mapping('ai-professional-developer-certificate-ibm', 2),
        mapping('comptia-a-professional-certificate', 3),
      ],
    } as any);

    const res = await GET(new Request(`http://localhost/api/careers/occupation/${CODE}`) as any, {
      params: Promise.resolve({ onetCode: CODE }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const aws = getProgramBySlug('ai-practitioner-professional-certificate-aws');
    const comptia = getProgramBySlug('comptia-a-professional-certificate');
    expect(aws && comptia).toBeTruthy();

    expect(body.mappedPrograms.map((m: any) => [m.programSlug, m.programTitle])).toEqual([
      ['google-it-support-certificate', 'Google IT Support Certificate'],
      ['ai-professional-developer-certificate-ibm', aws!.title],
      ['comptia-a-professional-certificate', comptia!.title],
    ]);
    for (const m of body.mappedPrograms) expect(m.programTitle).not.toMatch(/-[a-z]/);
  });
});
