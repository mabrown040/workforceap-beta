import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import GapAnalyzerForm from '@/components/portal/tools/GapAnalyzerForm';

export const metadata = buildPageMetadata({
  title: 'Resume Gap Analyzer',
  description: 'Detect employment gaps and get suggested framing for cover letters and interviews.',
  path: '/dashboard/ai-tools/gap-analyzer',
});

export default async function GapAnalyzerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/gap-analyzer');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
          <h1>Resume Gap Analyzer</h1>
          <p>Upload your resume. We&apos;ll flag employment gaps and suggest framing language for cover letters and interviews.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <GapAnalyzerForm />
          </div>
        </div>
      </section>
    </div>
  );
}
