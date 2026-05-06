import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';

export default async function CourseraIntegrationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/training');
  redirect('/dashboard/training');
}
