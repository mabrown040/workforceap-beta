import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { ExternalLink } from 'lucide-react';

export default async function CourseraIntegrationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/coursera');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram;

  return (
    <div className="portal-main-content">
      <PageHeader
        title="Your Course Portal"
        subtitle="Access your assigned Coursera courses and track your progress."
      />

      <div style={{ 
        padding: '2rem', 
        background: 'var(--color-gray-50)', 
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-gray-200)',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Coursera Enterprise Integration
        </h3>
        
        {enrolledProgram ? (
          <div>
            <p style={{ color: 'var(--color-gray-700)', marginBottom: '1rem', lineHeight: 1.6 }}>
              You're enrolled in: <strong>{enrolledProgram}</strong>
            </p>
            
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-gray-200)',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>
                Coming Soon: Embedded Course Access
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', lineHeight: 1.6, marginBottom: '1rem' }}>
                We're integrating Coursera Enterprise 500 directly into your portal. Soon you'll be able to:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
                <li style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-accent)' }}>✓</span>
                  <span>Access your assigned courses without leaving WorkforceAP</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-accent)' }}>✓</span>
                  <span>Track progress automatically synced with your dashboard</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-accent)' }}>✓</span>
                  <span>Complete courses and earn certificates all in one place</span>
                </li>
              </ul>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
                This feature will be available once we activate our Coursera Enterprise 500 licenses.
              </p>
            </div>

            <a
              href="https://www.coursera.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Visit Coursera.org for now
              <ExternalLink size={16} aria-hidden />
            </a>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
              You haven't enrolled in a program yet. Once you're enrolled and matched with courses, 
              you'll be able to access them directly from this page.
            </p>
            <a href="/dashboard/program" className="btn btn-primary">
              View Programs
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
