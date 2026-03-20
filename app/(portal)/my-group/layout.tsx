import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getSubgroupsForUser } from '@/lib/auth/roles';
import MyGroupShell from '@/components/portal/MyGroupShell';

export default async function MyGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/my-group');

  let subgroups: { subgroup: { id: string; name: string; type: string } }[];
  try {
    subgroups = await getSubgroupsForUser(user.id);
  } catch {
    redirect('/dashboard');
  }
  if (subgroups.length === 0) redirect('/dashboard');

  const names = subgroups.map((s) => s.subgroup.name).join(', ');
  return <MyGroupShell groupNames={names}>{children}</MyGroupShell>;
}
