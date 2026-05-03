import { getUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import InterviewPrepBundle from '@/components/portal/InterviewPrepBundle';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pre-Interview Prep Bundle — WorkforceAP',
};

export default async function InterviewPrepBundlePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/interview-prep');

  return (
    <main className="dashboard-container" style={{ maxWidth: '860px', margin: '0 auto', padding: '1rem' }}>
      <h1
        style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          marginBottom: '0.25rem',
          color: 'var(--color-on-surface)',
        }}
      >
        Pre-Interview Prep Bundle
      </h1>
      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--color-on-surface-variant)',
          marginBottom: '1.25rem',
          lineHeight: 1.5,
        }}
      >
        Everything you have built with our AI tools — pulled together for quick review before your next interview. Email it to yourself or copy it out.
      </p>

      <Suspense
        fallback={
          <div style={{ padding: '2rem 0' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>Building your bundle…</span>
          </div>
        }
      >
        <InterviewPrepBundle />
      </Suspense>
    </main>
  );
}
