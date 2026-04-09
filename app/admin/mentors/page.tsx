import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import MentorStatusButtons from '@/components/admin/MentorStatusButtons';
import PageHeader from '@/components/portal/PageHeader';
import PortalCard from '@/components/portal/ui/PortalCard';

export const metadata: Metadata = buildPageMetadata({ title: 'Admin – Mentors', description: 'Approve mentor applications and manage mentor access.', path: '/admin/mentors' });

export default async function AdminMentorsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/mentors');
  await requireAdmin(user.id);

  const mentors = await prisma.mentor.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, fullName: true, company: true, industry: true, isActive: true, approvedAt: true, createdAt: true } });

  return (
    <div className="portal-pad-x" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', maxWidth: '90rem', margin: '0 auto' }}>
      <PageHeader title="Mentor management" subtitle="Approve mentor applications, or deactivate access. Approved mentors receive an email when RESEND_API_KEY is configured." breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Mentors' }]} />
      <PortalCard className="portal-card--flat">
        <div className="admin-table-scroll admin-mentors-desktop">
          <table className="admin-table admin-table--sticky-first" style={{ minWidth: '52rem' }}><thead><tr><th>Name</th><th>Company</th><th>Industry</th><th>Status</th><th>Applied Date</th><th>Actions</th></tr></thead><tbody>{mentors.map((mentor) => (<tr key={mentor.id}><td>{mentor.fullName}</td><td>{mentor.company}</td><td>{mentor.industry}</td><td>{mentor.approvedAt ? (mentor.isActive ? 'Approved' : 'Deactivated') : 'Pending'}</td><td>{mentor.createdAt.toLocaleDateString()}</td><td><MentorStatusButtons mentorId={mentor.id} approvedAt={mentor.approvedAt} isActive={mentor.isActive} /></td></tr>))}</tbody></table>
        </div>
        <ul className="admin-portal-card-list admin-mentors-cards" aria-label="Mentors (mobile layout)">{mentors.map((mentor) => (<li key={mentor.id} className="admin-portal-card"><div className="admin-portal-card__header"><div><div style={{ fontWeight: 700 }}>{mentor.fullName}</div><div className="admin-portal-card__meta">{mentor.company}</div></div><span className="admin-portal-card__badge" style={{ background: mentor.approvedAt ? mentor.isActive ? 'rgba(74,155,79,0.12)' : 'var(--surface-container)' : 'rgba(217,119,6,0.12)', color: mentor.approvedAt ? mentor.isActive ? '#2d7a32' : 'var(--color-on-surface-variant)' : '#b45309' }}>{mentor.approvedAt ? mentor.isActive ? 'Approved' : 'Deactivated' : 'Pending'}</span></div><p className="admin-portal-card__meta">{mentor.industry}</p><p className="admin-portal-card__meta">Applied {mentor.createdAt.toLocaleDateString()}</p><div className="admin-portal-card__actions"><MentorStatusButtons mentorId={mentor.id} approvedAt={mentor.approvedAt} isActive={mentor.isActive} /></div></li>))}</ul>
      </PortalCard>
    </div>
  );
}
