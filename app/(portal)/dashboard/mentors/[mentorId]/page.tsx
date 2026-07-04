import { redirect } from 'next/navigation';
import PageHeader from '@/components/portal/PageHeader';
import MentorSessionForm from '@/components/portal/MentorSessionForm';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export default async function MentorProfilePage({ params }: { params: Promise<{ mentorId: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const { mentorId } = await params;
  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, isActive: true, approvedAt: { not: null } },
    select: { id: true, fullName: true, title: true, company: true, industry: true, bio: true, linkedinUrl: true },
  });

  if (!mentor || !mentor.id) redirect('/dashboard/mentors');

  const linkedinLink = mentor.linkedinUrl ? (
    <a
      href={mentor.linkedinUrl}
      target="_blank"
      rel="noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.9rem', color: 'var(--color-accent)', fontWeight: 600 }}
    >
      View LinkedIn profile
    </a>
  ) : null;

  return (
    <>
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '0.5rem 1rem 0' }}>
        <PageHeader
          title={mentor.fullName}
          subtitle={`${mentor.title} · ${mentor.company}`}
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'Mentors', href: '/dashboard/mentors' },
            { label: mentor.fullName },
          ]}
        />
      </div>

      {/* Mobile */}
      <div className="md:wa-hidden" style={{ padding: '0 1rem', paddingBottom: '6rem' }}>
        <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{mentor.industry}</div>
        <p style={{ lineHeight: 1.6 }}>{mentor.bio}</p>
        {linkedinLink}

        <div style={{ marginTop: '1.25rem' }}>
          <MentorSessionForm mentorId={mentor.id} />
        </div>
      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block" style={{ padding: '0 1.5rem 3rem', maxWidth: '52rem', margin: '0 auto' }}>
        <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', marginBottom: '0.9rem' }}>{mentor.industry}</div>
        <p style={{ lineHeight: 1.7 }}>{mentor.bio}</p>
        {linkedinLink}

        <div style={{ marginTop: '1.25rem', maxWidth: '32rem' }}>
          <MentorSessionForm mentorId={mentor.id} />
        </div>
      </div>
    </>
  );
}
