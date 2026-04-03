import { redirect } from 'next/navigation';

export default async function DashboardResumePage() {
  redirect('/dashboard/profile#resume');
}
