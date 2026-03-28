import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Users, MessageSquare, CheckCircle, AlertCircle, ArrowRight, Calendar, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';

export default async function CounselorPortalPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const allowed = (await isCounselor(user.id)) || (await isAdmin(user.id));
  if (!allowed) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
    include: { partner: { select: { name: true } } },
  });

  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: {
          counselor: { userId: user.id, active: true },
          active: true,
        },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              programInterest: true,
              enrolledProgram: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  let messagesNeedingReply = 0;
  if (counselor && assignments.length > 0) {
    const memberIds = assignments.map((a) => a.memberId);
    const threads = await prisma.messageThread.findMany({
      where: { memberId: { in: memberIds }, kind: 'member' },
      select: { id: true, memberId: true },
    });
    for (const t of threads) {
      if (!t.memberId) continue;
      const lastMsg = await prisma.message.findFirst({
        where: { threadId: t.id },
        orderBy: { createdAt: 'desc' },
        select: { authorId: true },
      });
      if (lastMsg?.authorId === t.memberId) messagesNeedingReply += 1;
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });
  if (!dbUser) redirect('/dashboard');

  const affiliation = counselor ? counselorAffiliationLabel(counselor.partner?.name) : 'WorkforceAP';

  const enrolledCount = assignments.filter((a) => a.member.enrolledProgram).length;
  const needsAttentionCount = assignments.filter(
    (a) => !a.member.enrolledProgram && !a.member.programInterest,
  ).length;

  const statCards = [
    { label: 'Active Students', value: assignments.length, icon: Users, color: 'wa-bg-m3-primary-container wa-text-m3-on-primary-container' },
    { label: 'Threads Needing Reply', value: messagesNeedingReply, icon: MessageSquare, color: 'wa-bg-m3-tertiary-container wa-text-m3-on-tertiary-container' },
    { label: 'Enrolled', value: enrolledCount, icon: CheckCircle, color: 'wa-bg-m3-secondary-container wa-text-m3-on-secondary-container' },
    { label: 'Needs Attention', value: needsAttentionCount, icon: AlertCircle, color: 'wa-bg-yellow-100 wa-text-yellow-800' },
  ];

  return (
    <div className="wa-space-y-8">
      {/* ── Header ── */}
      <header>
        <h1 className="wa-text-3xl wa-font-extrabold wa-tracking-tight wa-text-m3-on-surface">
          Welcome, {dbUser.fullName}
        </h1>
        <p className="wa-mt-1 wa-text-sm wa-text-m3-on-surface-variant">
          {affiliation} &middot; {assignments.length} active student{assignments.length === 1 ? '' : 's'}
        </p>
      </header>

      {/* ── 4-column stat cards ── */}
      <div className="wa-grid wa-grid-cols-2 lg:wa-grid-cols-4 wa-gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-5 wa-flex wa-items-start wa-gap-4"
          >
            <div className={`wa-rounded-xl wa-p-2.5 ${color}`}>
              <Icon size={20} aria-hidden />
            </div>
            <div>
              <p className="wa-text-2xl wa-font-bold wa-text-m3-on-surface">{value}</p>
              <p className="wa-text-xs wa-text-m3-on-surface-variant">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid: Students + Quick Actions ── */}
      <div className="wa-grid wa-grid-cols-12 wa-gap-6">
        {/* Left: Your Students (col-span-8) */}
        <section className="wa-col-span-12 lg:wa-col-span-8">
          <h2 className="wa-text-lg wa-font-bold wa-text-m3-on-surface wa-mb-4">
            Your Students ({assignments.length})
          </h2>

          {assignments.length === 0 ? (
            <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-8 wa-text-center">
              <p className="wa-text-sm wa-text-m3-on-surface-variant">
                No students assigned yet. Administrators assign members to you from the admin workspace.
              </p>
            </div>
          ) : (
            <div className="wa-space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-5 wa-transition-colors hover:wa-border-m3-outline"
                >
                  <div className="wa-flex wa-items-start wa-justify-between wa-mb-2">
                    <div>
                      <h3 className="wa-text-base wa-font-semibold wa-text-m3-on-surface">
                        {assignment.member.fullName}
                      </h3>
                      <p className="wa-text-xs wa-text-m3-on-surface-variant">
                        {assignment.member.email}
                      </p>
                    </div>
                    {assignment.member.enrolledProgram ? (
                      <span className="wa-rounded-full wa-bg-m3-secondary-container wa-text-m3-on-secondary-container wa-px-3 wa-py-1 wa-text-xs wa-font-semibold">
                        Enrolled
                      </span>
                    ) : (
                      <span className="wa-rounded-full wa-bg-yellow-100 wa-text-yellow-800 wa-px-3 wa-py-1 wa-text-xs wa-font-semibold">
                        Not enrolled
                      </span>
                    )}
                  </div>
                  <p className="wa-text-sm wa-text-m3-on-surface-variant wa-mb-3">
                    <span className="wa-font-medium wa-text-m3-on-surface">Program interest:</span>{' '}
                    {assignment.member.programInterest || 'Not specified'}
                  </p>
                  <div className="wa-flex wa-items-center wa-gap-4">
                    <Link
                      href={`/counselor/students/${assignment.member.id}`}
                      className="wa-text-xs wa-font-semibold wa-text-m3-primary hover:wa-underline wa-inline-flex wa-items-center wa-gap-1"
                    >
                      View Profile <ArrowRight size={12} aria-hidden />
                    </Link>
                    <Link
                      href={`/counselor/students/${assignment.member.id}/messages`}
                      className="wa-text-xs wa-font-semibold wa-text-m3-primary hover:wa-underline wa-inline-flex wa-items-center wa-gap-1"
                    >
                      Messages <MessageSquare size={12} aria-hidden />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Quick Actions (col-span-4) */}
        <aside className="wa-col-span-12 lg:wa-col-span-4 wa-space-y-4">
          <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-5">
            <h3 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-4">
              Quick Actions
            </h3>
            <nav className="wa-space-y-2">
              {[
                { href: '/counselor/messages', label: 'Messages', icon: MessageSquare },
                { href: '/counselor/resources', label: 'Resources', icon: BookOpen },
                { href: '/counselor/students', label: 'All Students', icon: Users },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="wa-flex wa-items-center wa-gap-3 wa-rounded-xl wa-px-4 wa-py-3 wa-text-sm wa-font-medium wa-text-m3-on-surface wa-transition-colors hover:wa-bg-m3-surface-container-high"
                >
                  <Icon size={16} className="wa-text-m3-primary" aria-hidden />
                  {label}
                  <ArrowRight size={14} className="wa-ml-auto wa-text-m3-on-surface-variant" aria-hidden />
                </Link>
              ))}
            </nav>
          </div>

          <div className="wa-rounded-2xl wa-border wa-border-dashed wa-border-m3-outline-variant/50 wa-bg-m3-surface-container-lowest wa-p-5 wa-text-center">
            <Calendar size={24} className="wa-mx-auto wa-mb-2 wa-text-m3-on-surface-variant" aria-hidden />
            <h3 className="wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-mb-1">
              Smart Schedule
            </h3>
            <p className="wa-text-xs wa-text-m3-on-surface-variant">
              AI-powered scheduling suggestions coming soon.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
