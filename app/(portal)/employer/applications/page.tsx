import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerApplicationsClient from '@/components/employer/EmployerApplicationsClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'WorkforceAP Applicants',
  description: 'View applications from WorkforceAP members to your job postings.',
  path: '/employer/applications',
});

export default async function EmployerApplicationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const applications = await prisma.jobPostingApplication.findMany({
    where: { job: { employerId: ctx.employerId } },
    orderBy: { appliedAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });

  const initialRows = applications.map((app) => ({
    id: app.id,
    jobId: app.jobId,
    status: app.status,
    appliedAt: app.appliedAt.toISOString(),
    employerNotes: app.employerNotes ?? null,
    job: app.job,
    student: app.student,
  }));

  const STATUS_FILTERS = ['All', 'pending', 'reviewing', 'interviewed', 'offer', 'hired', 'rejected'];

  return (
    <div>
      {/* ── Mobile Applications View (≤640px) ── */}
      <div className="block md:hidden pb-24">
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">Applicants</h1>
          <p className="text-xs text-on-surface-variant">Review and update candidate status.</p>
        </div>
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto px-6 pb-3 hide-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <span key={f} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${f === 'All' ? 'text-white' : 'bg-surface-container-highest text-on-surface'}`}
              style={f === 'All' ? { background: '#8c0f37' } : {}}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </span>
          ))}
        </div>
        {/* Application cards */}
        <div className="px-6 space-y-3">
          {initialRows.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 block mb-2">inbox</span>
              <p className="text-sm text-on-surface-variant">No applications yet.</p>
            </div>
          ) : (
            initialRows.map((app) => (
              <div key={app.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-on-surface text-sm truncate">{app.student.fullName}</h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter flex-shrink-0"
                        style={{
                          background: app.status === 'hired' ? '#dcfce7' : app.status === 'rejected' ? '#fee2e2' : app.status === 'pending' ? '#fff1f2' : '#fef3c7',
                          color: app.status === 'hired' ? '#166534' : app.status === 'rejected' ? '#991b1b' : app.status === 'pending' ? '#8c0f37' : '#7b5800',
                        }}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#7b5800] font-semibold uppercase tracking-wider truncate">{app.job.title}</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">{new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <MobileBottomNav />
      </div>
      {/* ── Desktop View ── */}
      <div className="hidden md:block">
        <PageHeader
          title="Applicants"
          subtitle="Update application status as you review candidates. Invalid workflow steps are blocked."
        />
        <EmployerApplicationsClient initialRows={initialRows} />
      </div>
    </div>
  );
}
