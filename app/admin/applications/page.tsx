import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { DesignSurface } from '@/components/portal/kit';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import type { ApplyEligibilityAnswersV1 } from '@/lib/apply/eligibilityQuestionnaire';
import { partnerReferralLabel } from '@/lib/apply/eligibilityQuestionnaire';
import ApplicationsDatasheetClient from './ApplicationsDatasheetClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Applications datasheet',
    description: 'Eligibility questionnaire answers and program selections for recent applications.',
    path: '/admin/applications',
    robots: { index: false, follow: false },
  });
}

function yn(v: string | null | undefined): string {
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return '—';
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/applications');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const sp = await searchParams;
  const highlight = typeof sp.highlight === 'string' ? sp.highlight : null;
  const orgId = await getActorOrganizationId(user.id);

  const applications = await withTenantScope(orgId, () =>
    prisma.application.findMany({
      where: {},
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        status: true,
        programInterest: true,
        programRankedSlugs: true,
        referralSource: true,
        submittedAt: true,
        createdAt: true,
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
              },
            },
            profile: {
              select: { city: true, state: true, zip: true, barrierTypes: true },
            },
          },
        },
      },
    })
  );

  const rows = applications.map((app) => {
    const screening = app.user.applyEligibilityScreenings[0] ?? null;
    const answers = (screening?.answers ?? null) as ApplyEligibilityAnswersV1 | null;
    const ranked = Array.isArray(app.programRankedSlugs)
      ? (app.programRankedSlugs as string[]).join(', ')
      : '';
    return {
      id: app.id,
      memberId: app.user.id,
      submittedAt: (app.submittedAt ?? app.createdAt).toISOString(),
      status: app.status,
      fullName: app.user.fullName ?? '—',
      email: app.user.email ?? '—',
      phone: app.user.phone ?? '—',
      programInterest: app.programInterest,
      programRanked: ranked,
      referralSource: app.referralSource ?? '—',
      ageGroup: answers?.ageGroup || '—',
      city: answers?.city || app.user.profile?.city || '—',
      state: answers?.state || app.user.profile?.state || '—',
      zip: answers?.zip || app.user.profile?.zip || '—',
      county: answers?.county || '—',
      currentlyUnemployed: yn(answers?.currentlyUnemployed ?? screening?.q1),
      receivingUnemployment: yn(answers?.receivingUnemployment ?? screening?.q3),
      unemploymentRanOut: yn(answers?.unemploymentRanOut),
      laidOffCompany: answers?.laidOffCompany || '—',
      onSnapWic: yn(answers?.onSnapWicFoodStamps),
      incomeBelow60k: yn(answers?.incomeBelow60k ?? screening?.q2),
      barriers: (answers?.primaryBarriers ?? app.user.profile?.barrierTypes ?? []).join('; ') || '—',
      hearAboutUs: answers?.hearAboutUs
        ? `${answers.hearAboutUs}${answers.hearAboutUsOther ? `: ${answers.hearAboutUsOther}` : ''}`
        : '—',
      partnerReferral:
        answers?.partnerOrAmbassadorReferred === 'yes'
          ? `${partnerReferralLabel(answers.partnerReferral)}${
              answers.partnerReferralOther ? `: ${answers.partnerReferralOther}` : ''
            }`
          : yn(answers?.partnerOrAmbassadorReferred),
      qualifies: screening ? (screening.qualifies ? 'Yes' : 'No') : '—',
      yesCount: screening?.yesCount ?? null,
      highlighted: highlight === app.id,
    };
  });

  return (
    <DesignSurface surface="dense">
      <PortalPageFrame>
        <PageHeader
          title="Applications datasheet"
          subtitle="Eligibility questionnaire answers for recent applications. Download CSV for spreadsheet review."
          action={
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex items-center rounded-md bg-[var(--wa-accent)] px-3 py-2 text-sm font-medium text-white"
                href="/api/admin/export/applications"
              >
                Download CSV
              </a>
              <Link
                className="inline-flex items-center rounded-md border border-[var(--wa-border)] px-3 py-2 text-sm"
                href="/admin/pipeline"
              >
                Applications funnel
              </Link>
            </div>
          }
        />
        <ApplicationsDatasheetClient rows={rows} />
      </PortalPageFrame>
    </DesignSurface>
  );
}
