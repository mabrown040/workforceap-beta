import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { buildCsv, csvDate } from '@/lib/csv';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import type { ApplyEligibilityAnswersV1 } from '@/lib/apply/eligibilityQuestionnaire';
import { partnerReferralLabel } from '@/lib/apply/eligibilityQuestionnaire';

function yn(v: string | null | undefined): string {
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return '';
}

async function _GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = await getActorOrganizationId(user.id);
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '500');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 2000) : 500;

  const applications = await withTenantScope(orgId, () =>
    prisma.application.findMany({
      where: {},
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        status: true,
        programInterest: true,
        programRankedSlugs: true,
        referralSource: true,
        submittedAt: true,
        createdAt: true,
        notes: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            applyEligibilityScreenings: {
              select: {
                q1: true,
                q2: true,
                q3: true,
                qualifies: true,
                yesCount: true,
                answers: true,
                createdAt: true,
              },
            },
            profile: {
              select: {
                city: true,
                state: true,
                zip: true,
                barrierTypes: true,
              },
            },
          },
        },
      },
    })
  );

  const headers = [
    'Application ID',
    'Submitted At',
    'Status',
    'Member ID',
    'Full Name',
    'Email',
    'Phone',
    'Program Interest',
    'Program Ranked Slugs',
    'Referral Source',
    'Age Group',
    'City',
    'State',
    'ZIP',
    'County',
    'Currently Unemployed',
    'Receiving Unemployment',
    'Unemployment Ran Out',
    'Laid Off Company',
    'SNAP/WIC/Food Stamps',
    'Income Below $60k',
    'Primary Barriers',
    'How Did You Hear',
    'Hear About Other',
    'Partner Referred',
    'Partner Referral',
    'Partner Referral Other',
    'Qualifies Soft Fit',
    'Yes Count',
  ];

  const rows = applications.map((app) => {
    const screening = app.user.applyEligibilityScreenings[0] ?? null;
    const answers = (screening?.answers ?? null) as ApplyEligibilityAnswersV1 | null;
    const profile = app.user.profile;
    const ranked = Array.isArray(app.programRankedSlugs)
      ? (app.programRankedSlugs as string[]).join(' | ')
      : '';

    return [
      app.id,
      csvDate(app.submittedAt ?? app.createdAt),
      app.status,
      app.user.id,
      app.user.fullName ?? '',
      app.user.email ?? '',
      app.user.phone ?? '',
      app.programInterest,
      ranked,
      app.referralSource ?? '',
      answers?.ageGroup ?? '',
      answers?.city ?? profile?.city ?? '',
      answers?.state ?? profile?.state ?? '',
      answers?.zip ?? profile?.zip ?? '',
      answers?.county ?? '',
      yn(answers?.currentlyUnemployed ?? screening?.q1),
      yn(answers?.receivingUnemployment ?? screening?.q3),
      yn(answers?.unemploymentRanOut),
      answers?.laidOffCompany ?? '',
      yn(answers?.onSnapWicFoodStamps),
      yn(answers?.incomeBelow60k ?? screening?.q2),
      (answers?.primaryBarriers ?? profile?.barrierTypes ?? []).join('; '),
      answers?.hearAboutUs ?? '',
      answers?.hearAboutUsOther ?? '',
      yn(answers?.partnerOrAmbassadorReferred),
      answers?.partnerReferral
        ? partnerReferralLabel(answers.partnerReferral)
        : '',
      answers?.partnerReferralOther ?? '',
      screening ? (screening.qualifies ? 'Yes' : 'No') : '',
      screening?.yesCount ?? '',
    ];
  });

  const csv = buildCsv(headers, rows, {
    reportTitle: 'Applications Eligibility Datasheet',
    notes: 'Adult apply questionnaire answers + program selections',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="workforceap-applications-${stamp}.csv"`,
    },
  });
}

export const GET = withApiGuc(_GET);
