import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import AdminUsersManager from '@/components/admin/AdminUsersManager';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin – Users',
  description: 'Manage user emails, roles, and password resets.',
  path: '/admin/users',
});
}

export default async function AdminUsersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/users');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const [users, canManageRoles, deletedCount] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        profile: { select: { role: true } },
      },
    }),
    isSuperAdmin(user.id),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
  ]);

  return (
    <PortalPageFrame>
      <PageHeader
        title="Users"
        subtitle="Manage emails, password resets, and admin access from one place."
        action={
          <Link
            href="/admin/users/deleted"
            className="btn btn-muted btn-small"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Trash2 size={14} aria-hidden />
            Deleted{deletedCount > 0 ? ` (${deletedCount})` : ''}
          </Link>
        }
      />

      <AdminUsersManager
        canManageRoles={canManageRoles}
        initialUsers={users.map((row) => ({
          id: row.id,
          fullName: row.fullName ?? row.email,
          email: row.email,
          role: row.profile?.role ?? 'member',
          createdAt: row.createdAt.toISOString(),
          memberHref: (row.profile?.role ?? 'member') === 'member' ? `/admin/members/${row.id}` : null,
        }))}
      />
    </PortalPageFrame>
  );
}
