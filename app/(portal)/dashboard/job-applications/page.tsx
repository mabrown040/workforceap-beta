import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import JobApplicationsTracker from '@/components/portal/JobApplicationsTracker';

export const metadata: Metadata = {
  title: 'Application Tracker | WorkforceAP',
  description: 'Track your job applications and interview progress',
};

export default async function JobApplicationsPage() {
  const user = await getUser();
  
  if (!user?.id) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Application Tracker</h1>
      <p className="text-gray-600 mb-6">
        Track every job you've applied to and where you stand in the process.
      </p>
      
      <JobApplicationsTracker userId={user.id} />
    </div>
  );
}
