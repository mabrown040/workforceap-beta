import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'New Invite',
  description: 'Send a new platform invitation.',
  path: '/admin/invites/new',
});

type InviteFormPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickQueryValue(input: string | string[] | undefined): string {
  if (Array.isArray(input)) return input[0] ?? '';
  return input ?? '';
}

export default async function AdminNewInvitePage({ searchParams }: InviteFormPageProps) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/invites/new');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const [subgroups, partners] = await Promise.all([
    prisma.subgroup.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.partner.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const params = (await searchParams) ?? {};
  const error = pickQueryValue(params.error);

  return (
    <div style={{ maxWidth: '680px', paddingTop: '1.5rem' }}>
      <PageHeader
        breadcrumbs={[{ label: 'Invites', href: '/admin/invites' }, { label: 'New Invite' }]}
        title="Send New Invite"
        subtitle="This form posts directly to the server and works even if client-side modal actions are unavailable."
      />

      {error ? (
        <div className="admin-inline-feedback admin-inline-feedback--error" role="alert" style={{ marginBottom: '1rem' }}>
          <p>{error}</p>
        </div>
      ) : null}

      <form method="post" action="/api/admin/invites" className="stitch-card" style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
        <label className="form-group" style={{ margin: 0 }}>
          <span>Email address</span>
          <input name="email" type="email" required placeholder="person@example.com" />
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Role</span>
          <select name="role" defaultValue="member">
            <option value="admin">Admin</option>
            <option value="partner">Partner</option>
            <option value="member">Student</option>
            <option value="counselor">Counselor</option>
          </select>
          <small style={{ color: 'var(--color-on-surface-variant)' }}>
            Optional fields below are applied only when relevant for the selected role.
          </small>
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Subgroup (partner invites only)</span>
          <select name="subgroupId" defaultValue="">
            <option value="">None</option>
            {subgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Partner affiliation (counselor invites only)</span>
          <select name="partnerId" defaultValue="">
            <option value="">WorkforceAP (organization counselor)</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Program pre-assignment (student invites only)</span>
          <select name="programSlug" defaultValue="">
            <option value="">None</option>
            {PROGRAMS.map((program) => (
              <option key={program.slug} value={program.slug}>
                {program.title}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Personal message (optional)</span>
          <textarea name="personalMessage" rows={4} placeholder="Add a personal note to the invitation..." />
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Link href="/admin/invites" className="btn btn-outline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary">
            Send Invite
          </button>
        </div>
      </form>
    </div>
  );
}
