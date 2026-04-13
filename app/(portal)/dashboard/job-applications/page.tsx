import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import JobApplicationsTracker from '@/components/portal/JobApplicationsTracker';
import MobileBottomNav from '@/components/MobileBottomNav';

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
    <>
    <div className="container wa-mx-auto wa-px-4 wa-py-8">
      <h1 className="wa-text-3xl wa-font-bold wa-mb-2">Application Tracker</h1>
      <p className="wa-text-gray-600 wa-mb-6">
        Track every job you've applied to and where you stand in the process.
      </p>
      
      <JobApplicationsTracker userId={user.id} />
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
