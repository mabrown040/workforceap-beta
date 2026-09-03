import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import { LOOKUP_LIST_CAP } from '@/lib/db/queryCaps';
import { PROGRAMS } from '@/lib/content/programs';
import { getProgramEnrollmentSteps } from '@/lib/content/programEnrollmentSteps';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'New Invite',
  description: 'Send a new platform invitation.',
  path: '/admin/invites/new',
});
}

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
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  const leaderOrg = inheritLeaderOrg(scope);
  const [subgroups, partners] = await withAdminPageScope(scope, (db) => Promise.all([
    db.subgroup.findMany({
      take: LOOKUP_LIST_CAP,
      where: { ...leaderOrg },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.partner.findMany({
      take: LOOKUP_LIST_CAP,
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]));

  const params = (await searchParams) ?? {};
  const error = pickQueryValue(params.error);

  return (
    <div style={{ maxWidth: '680px', paddingTop: '1.5rem' }}>
      <PageHeader
        breadcrumbs={[{ label: 'Invites', href: '/admin/invites' }, { label: 'New Invite' }]}
        title="Send New Invite"
        subtitle="Invite someone to join WorkforceAP. They'll get an email with a link to sign up."
      />

      {error ? (
        <div className="admin-inline-feedback admin-inline-feedback--error" role="alert" style={{ marginBottom: '1rem' }}>
          <p>{error}</p>
        </div>
      ) : null}

      <section className="portal-card portal-card--flat" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Enrollment steps (member Path to certification)</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
          When you assign a program on the invite, members see these steps under{' '}
          <strong>Member Portal → My Program → Path to certification</strong> after they accept.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {PROGRAMS.map((p) => {
            const steps = getProgramEnrollmentSteps(p.slug);
            return (
              <details key={p.slug} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.65rem', padding: '0.5rem 0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{p.title}</summary>
                <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                  {steps.map((s) => (
                    <li key={s.id} style={{ marginBottom: '0.25rem' }}>
                      {s.title}
                    </li>
                  ))}
                </ol>
              </details>
            );
          })}
        </div>
      </section>

      <form method="post" action="/api/admin/invites" className="portal-card portal-card--flat" style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
        <label className="form-group" style={{ margin: 0 }}>
          <span>Email address</span>
          <input name="email" type="email" required placeholder="person@example.com" />
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Role</span>
          <select name="role" defaultValue="member">
            <option value="admin">Admin</option>
            <option value="partner">Partner</option>
            <option value="member">Member</option>
            <option value="counselor">Counselor</option>
          </select>
          <small style={{ color: 'var(--color-on-surface-variant)' }}>
            The fields below change based on which role you pick.
          </small>
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Subgroup (for partners)</span>
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
          <span>Counselor type (for counselors)</span>
          <select name="counselorAffiliation" defaultValue="wap_staff">
            <option value="wap_staff">WorkforceAP staff counselor</option>
            <option value="community_ambassador">Community Ambassador</option>
            <option value="partner">Partner-organisation counselor (pick the partner below)</option>
            <option value="independent">Independent advisor</option>
          </select>
          <small style={{ color: 'var(--color-on-surface-variant)' }}>
            Community Ambassadors get a counselor sign-in plus a login code, set up their counselor profile, and
            see only the members you assign to them.
          </small>
        </label>

        <label className="form-group" style={{ margin: 0 }}>
          <span>Partner affiliation (for counselors)</span>
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
          <span>Assign to program (for members)</span>
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
