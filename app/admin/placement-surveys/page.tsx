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

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Placement surveys',
    description: 'Post-placement survey results and statistics.',
    path: '/admin/placement-surveys',
  });
}

async function loadSurveyStats() {
  try {
    const [
      surveys,
      total,
      completedCount,
      pendingCount,
      testimonialCount,
      avgJobSatisfactionAgg,
      avgTrainingRelevanceAgg,
    ] = await Promise.all([
      prisma.placementSurvey.findMany({
        orderBy: { sentAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              enrolledProgram: true,
            },
          },
        },
      }),
      prisma.placementSurvey.count(),
      prisma.placementSurvey.count({ where: { completedAt: { not: null } } }),
      prisma.placementSurvey.count({ where: { completedAt: null } }),
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

export default async function PlacementSurveysPage() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    redirect('/login');
  }

  const data = await loadSurveyStats();
  const stats = data?.stats;
  const surveys = data?.surveys ?? [];

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
                {surveys.map((s: any) => (
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
