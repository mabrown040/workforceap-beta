import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';

export default async function CoachPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?redirectTo=/coach');
  }
  redirect('/dashboard/ai-tools/career-business-coach');
}
