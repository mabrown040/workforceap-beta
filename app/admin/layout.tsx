import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { SignOutButton } from '@/components/portal/SignOutButton';
import DevViewToggle from '@/components/portal/DevViewToggle';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--color-border, #e5e5e5)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white',
        }}
      >
        <Link href="/admin" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: 'inherit' }}>
          WorkforceAP Admin
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <DevViewToggle />
          <SignOutButton />
        </div>
      </header>
      <div style={{ display: 'flex', flex: 1 }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '1.5rem 2rem', minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
