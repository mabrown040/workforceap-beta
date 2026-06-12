import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Member-owned eligibility questionnaire (§9). Reuses the `app/api/member/profile`
 * pattern: city/state/zip + barrierTypes write to Profile columns (which exist).
 *
 * ageGroup + county have NO dedicated Profile column, so — without migrating —
 * they are persisted alongside the member's existing WIOA metadata on
 * `User.wioaQualificationJson` (the same JSON column the self-service WIOA
 * screening already owns). We merge into any existing snapshot rather than
 * clobber it, under an `eligibilityForm` key.
 */
const AGE_GROUP_VALUES = ['18_24', '25_50', '50_plus'] as const;

const eligibilitySchema = z.object({
  ageGroup: z.enum(AGE_GROUP_VALUES).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(50).optional().nullable(),
  zip: z.string().trim().max(20).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  primaryBarriers: z.array(z.string().trim().max(100)).max(20).optional().nullable(),
});

type EligibilityFormMeta = {
  version: 1;
  updatedAt: string;
  ageGroup: string | null;
  county: string | null;
};

async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: {
        fullName: true,
        email: true,
        wioaQualificationJson: true,
        profile: { select: { city: true, state: true, zip: true, barrierTypes: true } },
      },
    }));
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const snapshot = (dbUser.wioaQualificationJson ?? null) as Record<string, unknown> | null;
    const meta =
      snapshot && typeof snapshot.eligibilityForm === 'object' && snapshot.eligibilityForm !== null
        ? (snapshot.eligibilityForm as Partial<EligibilityFormMeta>)
        : null;

    return NextResponse.json({
      fullName: dbUser.fullName,
      email: dbUser.email,
      ageGroup: meta?.ageGroup ?? null,
      county: meta?.county ?? null,
      city: dbUser.profile?.city ?? null,
      state: dbUser.profile?.state ?? null,
      zip: dbUser.profile?.zip ?? null,
      primaryBarriers: dbUser.profile?.barrierTypes ?? [],
    });
  } catch (error) {
    console.error('/member/eligibility error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

async function _PATCH(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = eligibilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }

    const { ageGroup, city, state, zip, county, primaryBarriers } = parsed.data;
    const barrierTypes = (primaryBarriers ?? [])
      .map((b) => b.trim())
      .filter((b) => b && b !== 'none');

    await prisma.$transaction(async (tx) => {
      // city/state/zip + barrierTypes → Profile (existing columns), mirrors
      // app/api/member/profile + the apply signup flow.
      const profileData: Record<string, unknown> = {};
      if (city !== undefined) profileData.city = city?.trim() || null;
      if (state !== undefined) profileData.state = state?.trim() || null;
      if (zip !== undefined) profileData.zip = zip?.trim() || null;
      if (primaryBarriers !== undefined) {
        profileData.barrierTypes = barrierTypes;
        profileData.hasEmploymentBarrier = barrierTypes.length > 0;
      }

      await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      });

      // ageGroup + county → User.wioaQualificationJson (no Profile column; no
      // migration). Merge into any existing snapshot under `eligibilityForm`.
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: { wioaQualificationJson: true },
      });
      const existing =
        (current?.wioaQualificationJson as Record<string, unknown> | null) ?? {};
      const meta: EligibilityFormMeta = {
        version: 1,
        updatedAt: new Date().toISOString(),
        ageGroup: ageGroup ?? null,
        county: county?.trim() || null,
      };
      await tx.user.update({
        where: { id: user.id },
        data: { wioaQualificationJson: { ...existing, eligibilityForm: meta } as object },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/member/eligibility error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
