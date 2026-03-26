import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';

export default async function CounselorResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/resources');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const admin = await isAdmin(user.id);

  return (
    <div className="portal-main-content">
      <PageHeader title="Resources" subtitle="Quick links for counselors." />

      <ul style={{ lineHeight: 1.8, paddingLeft: '1.25rem' }}>
        {admin ? (
          <>
            <li>
              <Link href="/admin/members">Admin — members</Link>
            </li>
            <li>
              <Link href="/admin/messages">Admin — portal messages</Link>
            </li>
          </>
        ) : null}
        <li>
          <Link href="/help">Help &amp; support</Link>
        </li>
      </ul>
    </div>
  );
}
