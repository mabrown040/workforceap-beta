import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import AIToolCard from '@/components/portal/AIToolCard';
import { TOOL_JOBS, TOOL_METADATA, TOOL_METADATA_BY_SLUG } from '@/lib/ai/toolMeta';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Toolkit',
  description: 'AI-powered tools organized around the real job-seeker workflow: improve your resume, evaluate fit, tailor materials, and prepare for interviews.',
  path: '/dashboard/ai-tools',
});

const RECOMMENDED_FALLBACKS = ['resume-rewriter', 'job-match-scorer', 'interview-practice'] as const;

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools');

  let suggestedActions: Array<{ label: string; href: string }> = [];
  try {
    const briefContext = await getCareerBriefContext(user.id);
    suggestedActions = briefContext.recommendedActions.filter((action) => action.href.startsWith('/dashboard/ai-tools')).slice(0, 3);
  } catch {
    suggestedActions = RECOMMENDED_FALLBACKS.map((slug) => ({ label: TOOL_METADATA_BY_SLUG[slug].title, href: TOOL_METADATA_BY_SLUG[slug].href }));
  }

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>AI Career Toolkit</h1>
          <p>Use the tools in sequence: strengthen your resume, check job fit, tailor your materials, then prepare for interviews and offers.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="ai-tool-dashboard-intro">
            <div>
              <p className="ai-tool-dashboard-kicker">Primary jobs to be done</p>
              <h2>Move through the search the way members actually work.</h2>
              <p>The toolkit is now grouped around the biggest member jobs: improve a resume, evaluate job fit, tailor materials, prepare for interviews, and keep momentum through application tracking and offer negotiation.</p>
            </div>
            <div className="ai-tool-dashboard-actions">
              <Link href="/dashboard/ai-tools/history" className="btn btn-outline">View my saved results</Link>
              <Link href="/dashboard/ai-tools/application-tracker" className="btn btn-primary">Open application tracker</Link>
            </div>
          </div>

          {suggestedActions.length > 0 && (
            <div className="ai-tool-suggested-strip">
              <p>Suggested next actions</p>
              <div>
                {suggestedActions.map((action) => (
                  <Link key={action.href + action.label} href={action.href} className="btn btn-primary btn-sm">{action.label}</Link>
                ))}
              </div>
            </div>
          )}

          <div className="ai-tool-sequence-strip">
            {['resume-rewriter', 'job-match-scorer', 'cover-letter', 'interview-practice'].map((slug, index) => {
              const tool = TOOL_METADATA_BY_SLUG[slug as keyof typeof TOOL_METADATA_BY_SLUG];
              return (
                <div key={slug} className="ai-tool-sequence-step">
                  <span>Step {index + 1}</span>
                  <strong>{tool.title}</strong>
                  <p>{tool.description}</p>
                </div>
              );
            })}
          </div>

          <div className="ai-tool-job-groups">
            {TOOL_JOBS.map((job) => (
              <section key={job.id} className="ai-tool-job-group">
                <div className="ai-tool-job-group-header">
                  <div>
                    <p className="ai-tool-job-group-kicker">{job.sequenceLabel}</p>
                    <h2>{job.title}</h2>
                    <p>{job.description}</p>
                  </div>
                </div>
                <div className="ai-tools-grid">
                  {job.toolSlugs.map((slug) => {
                    const tool = TOOL_METADATA_BY_SLUG[slug];
                    return (
                      <AIToolCard
                        key={tool.slug}
                        id={tool.slug}
                        title={tool.title}
                        description={tool.description}
                        timeToComplete={tool.timeToComplete}
                        status={tool.status}
                        href={tool.href}
                        expectation={tool.shortExpectations}
                        inputHelp={tool.inputHelp}
                        outputUse={tool.outputUse}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <section className="ai-tool-library-section">
            <div className="ai-tool-job-group-header">
              <div>
                <p className="ai-tool-job-group-kicker">Full library</p>
                <h2>All available tools at a glance.</h2>
                <p>If you already know what you need, jump straight to a tool from the complete list below.</p>
              </div>
            </div>
            <div className="ai-tools-grid">
              {TOOL_METADATA.map((tool) => (
                <AIToolCard
                  key={tool.slug}
                  id={tool.slug}
                  title={tool.title}
                  description={tool.description}
                  timeToComplete={tool.timeToComplete}
                  status={tool.status}
                  href={tool.href}
                />
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
