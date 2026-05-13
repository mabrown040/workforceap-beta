import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin - Mentors',
  description: 'Review mentor applications and manage mentor activation.',
  path: '/admin/mentors',
});
}

async function updateMentorAction(formData: FormData) {
  'use server';

  const user = await getUser();
  if (!user) return;
  await requireAdmin(user.id);

  const mentorId = String(formData.get('mentorId') || '');
  const action = String(formData.get('action') || '');

  if (!mentorId) return;

  if (action === 'approve') {
    await prisma.mentor.update({ where: { id: mentorId }, data: { isActive: true, approvedAt: new Date() } });
  }

  if (action === 'deactivate') {
    await prisma.mentor.update({ where: { id: mentorId }, data: { isActive: false } });
  }

  if (action === 'activate') {
    await prisma.mentor.update({ where: { id: mentorId }, data: { isActive: true } });
  }
}

function getMentorStatusLabel(mentor: {
  approvedAt: Date | null;
  isActive: boolean;
}) {
  if (!mentor.approvedAt) return 'Pending';
  return mentor.isActive ? 'Approved' : 'Deactivated';
}

const actionButtonStyle = {
  border: 0,
  borderRadius: '0.45rem',
  padding: '0.45rem 0.7rem',
  color: '#fff',
  fontWeight: 600,
};

export default async function AdminMentorsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/mentors');
  await requireAdmin(user.id);

  const mentors = await prisma.mentor.findMany({
    take: 5000,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      company: true,
      industry: true,
      isActive: true,
      approvedAt: true,
      createdAt: true,
    },
  });

  return (
    <main style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Mentors"
        subtitle="Review mentor applications and toggle active mentor availability."
      />

      <div className="md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {mentors.map((mentor) => {
          const status = getMentorStatusLabel(mentor);
          return (
            <div key={mentor.id} className="portal-card portal-card--flat" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{mentor.fullName}</h2>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                    {mentor.company || 'No company listed'}
                  </p>
                </div>
                <span className="admin-job-status-pill" style={{ alignSelf: 'flex-start' }}>{status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                    Industry
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem' }}>{mentor.industry || 'Not provided'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                    Applied
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem' }}>{mentor.createdAt.toLocaleDateString()}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!mentor.approvedAt ? (
                  <form action={updateMentorAction}>
                    <input type="hidden" name="mentorId" value={mentor.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button type="submit" style={{ ...actionButtonStyle, width: '100%', background: 'var(--color-accent)' }}>Approve mentor</button>
                  </form>
                ) : null}
                {mentor.approvedAt && mentor.isActive ? (
                  <form action={updateMentorAction}>
                    <input type="hidden" name="mentorId" value={mentor.id} />
                    <input type="hidden" name="action" value="deactivate" />
                    <button type="submit" style={{ ...actionButtonStyle, width: '100%', background: '#a91b3f' }}>Deactivate mentor</button>
                  </form>
                ) : null}
                {mentor.approvedAt && !mentor.isActive ? (
                  <form action={updateMentorAction}>
                    <input type="hidden" name="mentorId" value={mentor.id} />
                    <input type="hidden" name="action" value="activate" />
                    <button type="submit" style={{ ...actionButtonStyle, width: '100%', background: 'var(--color-accent)' }}>Activate mentor</button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wa-hidden md:wa-block" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '52rem' }}>
        <DataTable
          variant="portal"
          scrollX={false}
          rows={mentors}
          rowKey={(m) => m.id}
          columns={[
            { key: 'name', header: 'Name', cell: (mentor) => mentor.fullName },
            { key: 'company', header: 'Company', cell: (mentor) => mentor.company },
            { key: 'industry', header: 'Industry', cell: (mentor) => mentor.industry },
            { key: 'status', header: 'Status', cell: (mentor) => getMentorStatusLabel(mentor) },
            {
              key: 'applied',
              header: 'Applied Date',
              cell: (mentor) => mentor.createdAt.toLocaleDateString(),
            },
            {
              key: 'actions',
              header: 'Actions',
              cell: (mentor) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!mentor.approvedAt ? (
                    <form action={updateMentorAction}>
                      <input type="hidden" name="mentorId" value={mentor.id} />
                      <input type="hidden" name="action" value="approve" />
                      <button type="submit" style={{ ...actionButtonStyle, background: 'var(--color-accent)' }}>
                        Approve
                      </button>
                    </form>
                  ) : null}
                  {mentor.approvedAt && mentor.isActive ? (
                    <form action={updateMentorAction}>
                      <input type="hidden" name="mentorId" value={mentor.id} />
                      <input type="hidden" name="action" value="deactivate" />
                      <button type="submit" style={{ ...actionButtonStyle, background: '#a91b3f' }}>
                        Deactivate
                      </button>
                    </form>
                  ) : null}
                  {mentor.approvedAt && !mentor.isActive ? (
                    <form action={updateMentorAction}>
                      <input type="hidden" name="mentorId" value={mentor.id} />
                      <input type="hidden" name="action" value="activate" />
                      <button type="submit" style={{ ...actionButtonStyle, background: 'var(--color-accent)' }}>
                        Activate
                      </button>
                    </form>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </div>
      </div>
    </main>
  );
}
