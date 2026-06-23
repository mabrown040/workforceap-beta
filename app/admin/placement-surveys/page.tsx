import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import PlacementSurveysWhatsThis from '@/components/admin/PlacementSurveysWhatsThis';
import { ClipboardCheck, Star, Users, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import {
  PlacementSurveysKit,
  type PlacementSurveyRow,
} from '@/components/portal/kit/pages/admin-subviews/PlacementSurveysKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Placement surveys',
    description: 'Post-placement survey results and statistics.',
    path: '/admin/placement-surveys',
  });
}

/** Survey wave → display stage label (mockup uses "30-day" / "90-day"). */
const WAVE_LABEL: Record<string, string> = {
  thirty_day: '30-day',
  sixty_day: '60-day',
  ninety_day: '90-day',
};

function waveLabel(wave: string): string {
  return WAVE_LABEL[wave] ?? wave.replace(/_/g, ' ');
}

function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function loadSurveyStats() {
  try {
    const [
      surveys,
      total,
      completedCount,
      pendingCount,
      stillEmployedCount,
      testimonialCount,
      avgJobSatisfactionAgg,
      avgTrainingRelevanceAgg,
    ] = await Promise.all([
      prisma.placementSurvey.findMany({
        orderBy: { sentAt: 'desc' },
        take: 100,
        select: {
          id: true,
          wave: true,
          sentAt: true,
          completedAt: true,
          stillEmployed: true,
          jobSatisfaction: true,
          trainingRelevance: true,
          supportQuality: true,
          allowTestimonial: true,
          user: {
            select: { fullName: true, email: true, enrolledProgram: true },
          },
        },
      }),
      prisma.placementSurvey.count(),
      prisma.placementSurvey.count({ where: { completedAt: { not: null } } }),
      prisma.placementSurvey.count({ where: { completedAt: null } }),
      prisma.placementSurvey.count({
        where: { completedAt: { not: null }, stillEmployed: true },
      }),
      prisma.placementSurvey.count({
        where: { completedAt: { not: null }, allowTestimonial: true },
      }),
      prisma.placementSurvey.aggregate({
        where: { completedAt: { not: null } },
        _avg: { jobSatisfaction: true },
      }),
      prisma.placementSurvey.aggregate({
        where: { completedAt: { not: null } },
        _avg: { trainingRelevance: true },
      }),
    ]);

    return {
      total,
      surveys,
      stats: {
        completed: completedCount,
        pending: pendingCount,
        stillEmployed: stillEmployedCount,
        avgJobSatisfaction: avgJobSatisfactionAgg._avg.jobSatisfaction
          ? Math.round(avgJobSatisfactionAgg._avg.jobSatisfaction * 10) / 10
          : null,
        avgTrainingRelevance: avgTrainingRelevanceAgg._avg.trainingRelevance
          ? Math.round(avgTrainingRelevanceAgg._avg.trainingRelevance * 10) / 10
          : null,
        testimonialCount,
      },
    };
  } catch {
    return null;
  }
}

export default async function PlacementSurveysPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    redirect('/login');
  }

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  const data = await loadSurveyStats();
  const stats = data?.stats;
  const surveys = data?.surveys ?? [];

  // --- LEGACY: original stats grid + responses table (escape hatch) ---
  if (requestedUi === 'legacy') {
    return (
      <PortalPageFrame>
        <PageHeader title="Placement Surveys" subtitle="Post-placement member feedback and outcomes" />

        <PlacementSurveysWhatsThis />

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Sent"
            value={data?.total ?? 0}
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            label="Completed"
            value={stats?.completed ?? 0}
            icon={<ClipboardCheck className="w-5 h-5" />}
          />
          <StatCard
            label="Pending"
            value={stats?.pending ?? 0}
            icon={<Clock className="w-5 h-5" />}
          />
          <StatCard
            label="Avg Satisfaction"
            value={stats?.avgJobSatisfaction ?? '—'}
            icon={<Star className="w-5 h-5" />}
          />
          <StatCard
            label="Avg Training"
            value={stats?.avgTrainingRelevance ?? '—'}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            label="Testimonials"
            value={stats?.testimonialCount ?? 0}
            icon={<MessageSquare className="w-5 h-5" />}
          />
        </div>

        {/* Survey responses table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Responses</h2>
          </div>
          {surveys.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No survey responses yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Program</th>
                    <th scope="col" className="px-4 py-3 text-center font-medium text-gray-600">Satisfaction</th>
                    <th scope="col" className="px-4 py-3 text-center font-medium text-gray-600">Training</th>
                    <th scope="col" className="px-4 py-3 text-center font-medium text-gray-600">Support</th>
                    <th scope="col" className="px-4 py-3 text-center font-medium text-gray-600">Employed</th>
                    <th scope="col" className="px-4 py-3 text-center font-medium text-gray-600">Testimonial</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {surveys.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.user?.fullName ?? '—'}</div>
                        <div className="text-gray-500 text-xs">{s.user?.email ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.user?.enrolledProgram ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {s.jobSatisfaction ? (
                          <span className="inline-flex items-center gap-1">
                            {s.jobSatisfaction} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.trainingRelevance ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.supportQuality ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.stillEmployed === true ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : s.stillEmployed === false ? (
                          <span className="text-red-600">No</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.allowTestimonial ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.completedAt
                          ? new Date(s.completedAt).toLocaleDateString()
                          : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PortalPageFrame>
    );
  }

  // --- DEFAULT: design-kit follow-up tracking ---

  const sent = data?.total ?? 0;
  const completed = stats?.completed ?? 0;
  const stillEmployed = stats?.stillEmployed ?? 0;

  const responseRate = sent > 0 ? `${Math.round((completed / sent) * 100)}%` : '—';
  const stillEmployedRate =
    completed > 0 ? `${Math.round((stillEmployed / completed) * 100)}%` : '—';

  const rows: PlacementSurveyRow[] = surveys.map((s) => ({
    id: s.id,
    student: s.user?.fullName?.trim() || '—',
    stage: waveLabel(s.wave),
    sent: shortDate(new Date(s.sentAt)),
    status: s.completedAt ? 'Complete' : 'Sent',
    stillEmployed:
      s.stillEmployed === true ? 'Yes' : s.stillEmployed === false ? 'No' : '—',
  }));

  return (
    <PlacementSurveysKit
      rows={rows}
      sent={sent}
      completed={completed}
      responseRate={responseRate}
      stillEmployedRate={stillEmployedRate}
    />
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 text-gray-500 mb-2">{icon}<span className="text-xs font-medium uppercase">{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
