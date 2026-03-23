import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

const STATUS_NEXT: Record<string, string> = {
  pending:
    'The employer will review your profile against the role. You may be contacted for screening or interview next.',
  reviewing: 'Your application is under active review — watch your email for next steps.',
  interview: 'Interview stage — respond quickly to scheduling requests from the employer.',
  offered: 'Offer extended — review terms and respond through your contact with the employer.',
  hired: 'Marked hired — congratulations; stay in touch with WorkforceAP for support if needed.',
  rejected: 'This role was not a match. Explore other openings on the job board.',
};

export default async function MemberJobPostingTransparency({ userId }: { userId: string }) {
  const apps = await prisma.jobPostingApplication.findMany({
    where: { studentId: userId },
    orderBy: { appliedAt: 'desc' },
    take: 12,
    include: {
      job: { select: { title: true, id: true, employer: { select: { companyName: true } } } },
    },
  });

  if (apps.length === 0) return null;

  return (
    <aside className="member-job-posting-panel" aria-labelledby="member-jp-heading">
      <h2 id="member-jp-heading" className="member-job-posting-title">
        WorkforceAP job applications
      </h2>
      <p className="member-job-posting-lead">
        Status for roles you applied to through WorkforceAP. This is separate from applications you track manually below.
      </p>
      <ul className="member-job-posting-list">
        {apps.map((a) => (
          <li key={a.id} className="member-job-posting-item">
            <div>
              <strong>{a.job.title}</strong>
              <span className="member-job-posting-co"> · {a.job.employer.companyName}</span>
            </div>
            <div className="member-job-posting-status">Status: {a.status}</div>
            <p className="member-job-posting-next">{STATUS_NEXT[a.status] ?? STATUS_NEXT.pending}</p>
            <div className="member-job-posting-meta">Applied {a.appliedAt.toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
      <Link href="/jobs" className="member-job-posting-link">
        Browse open jobs
      </Link>
    </aside>
  );
}
