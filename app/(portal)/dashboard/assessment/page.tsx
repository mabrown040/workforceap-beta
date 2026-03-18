import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import AssessmentForm from '@/components/portal/AssessmentForm';

export default async function AssessmentPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/assessment');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { assessmentCompleted: true, fullName: true, phone: true },
  });

  if (dbUser?.assessmentCompleted) {
    redirect('/dashboard');
  }

  const nameParts = dbUser?.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>One quick step before your training begins</h1>
          <p>
            Before we connect you with your Coursera courses, we need a 10-minute skills snapshot.
            This helps your counselor personalize your learning path and identify any additional support resources.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container" style={{ maxWidth: '720px' }}>
          <AssessmentForm
            defaultFirstName={firstName}
            defaultLastName={lastName}
            defaultPhone={dbUser?.phone ?? ''}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
