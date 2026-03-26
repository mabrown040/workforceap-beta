import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getResourcesForCategory } from '@/lib/content/programResources';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';

export const metadata: Metadata = buildPageMetadata({
  title: 'Program resources',
  description: 'AI career tools, external guides, and program-specific resources for your track.',
  path: '/dashboard/resources',
});

const CAREER_TOOLS = [
  { title: 'Resume Tips', url: 'https://www.coursera.org/articles/resume-tips', description: 'External resource' },
  { title: 'Interview Prep', url: 'https://www.coursera.org/articles/interview-tips', description: 'External resource' },
  { title: 'LinkedIn Profile Guide', url: 'https://www.linkedin.com/help/linkedin/answer/a521928', description: 'External resource' },
];

const CATEGORY_LABELS: Record<string, string> = {
  'digital-literacy': 'Digital Literacy',
  'ai-software': 'AI & Software Dev',
  'cloud-data': 'Cloud & Data',
  'it-cyber': 'IT & Cybersecurity',
  business: 'Business',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
};

export default async function DashboardResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/resources');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  const counselorAssignment = await prisma.counselorAssignment.findFirst({
    where: { memberId: user.id, active: true },
    orderBy: { assignedAt: 'desc' },
    select: {
      counselor: {
        select: {
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });
  const counselorContact = counselorAssignment?.counselor.user ?? null;

  const program = dbUser?.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const category = program?.category ?? 'ai-software';

  let suggestedActions: Array<{ label: string; href: string }> = [];
  try {
    const briefContext = await getCareerBriefContext(user.id);
    suggestedActions = briefContext.recommendedActions.filter((a) => a.href.startsWith('/dashboard/ai-tools'));
  } catch {
    suggestedActions = [
      { label: 'Build your resume', href: '/dashboard/ai-tools/resume-rewriter' },
      { label: 'Practice interview questions', href: '/dashboard/ai-tools/interview-practice' },
      { label: 'Log your first application', href: '/dashboard/ai-tools/application-tracker' },
    ];
  }

  const suggestedAiTools = suggestedActions
    .filter((a) => a.href.startsWith('/dashboard/ai-tools'))
    .slice(0, 4);

  return (
    <div className="portal-resources-page">
      <nav className="learning-hub-breadcrumb" aria-label="Learning hub">
        <Link href="/dashboard/learning">Learning hub</Link>
        <span className="learning-hub-breadcrumb-sep" aria-hidden>
          /
        </span>
        <span className="learning-hub-breadcrumb-current">Program resources</span>
      </nav>
      <h1 className="portal-resources-title">Program resources &amp; tools</h1>
      <p className="portal-resources-lead">
        AI tools, career tips, and links matched to your program category — plus ways to reach the team.
      </p>

      {suggestedAiTools.length > 0 && (
        <section className="portal-resources-section">
          <h2 className="portal-resources-section-title">Suggested for you</h2>
          <p className="portal-resources-section-lead">
            Based on your progress — try these AI tools next:
          </p>
          <div className="portal-resources-suggested-row">
            {suggestedAiTools.map((a) => (
              <Link key={a.href + a.label} href={a.href} className="portal-resources-pill-link">
                {a.label} →
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="portal-resources-section">
        <h2 className="portal-resources-section-title portal-resources-section-title--tight">
          All AI Career Tools
        </h2>
        <p className="portal-resources-section-lead">
          Resume builder, LinkedIn headline, cover letter, interview practice, and more — powered by AI.
        </p>
        <Link href="/dashboard/ai-tools" className="portal-resources-cta-primary">
          Open AI Tools →
        </Link>
      </section>

      <section className="portal-resources-section">
        <h2 className="portal-resources-section-title portal-resources-section-title--tight">
          Career Tips
        </h2>
        <div className="portal-resources-link-grid">
          {CAREER_TOOLS.map((t) => (
            <a key={t.title} href={t.url} target="_blank" rel="noopener noreferrer" className="portal-resources-link-card">
              <strong>{t.title}</strong>
              <span className="portal-resources-link-card-meta">— {t.description}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="portal-resources-section">
        <h2 className="portal-resources-section-title portal-resources-section-title--tight">
          Program Resources
        </h2>
        <p className="portal-resources-section-lead">
          Filtered for your program category: {CATEGORY_LABELS[category] ?? category}
        </p>
        <div className="portal-resources-grid-cards">
          {getResourcesForCategory(category).map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-resources-link-card portal-resources-link-card--filled"
            >
              <div className="portal-resources-link-card-title">{r.title}</div>
              <div className="portal-resources-link-card-desc">{r.description}</div>
              <span className="portal-resources-link-card-cta">Visit Resource →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="portal-resources-section">
        <h2 className="portal-resources-section-title portal-resources-section-title--tight">
          Support
        </h2>
        <div className="portal-resources-support-grid">
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:info@workforceap.org">info@workforceap.org</a>
          </p>
          <p>
            <strong>Phone:</strong> (512) 777-1808
          </p>
          <p className="portal-resources-support-text">
            <strong>Loaner Laptop:</strong> Earned upon successful program completion — see{' '}
            <Link href="/how-it-works">How It Works</Link>
          </p>
        </div>
      </section>

      <section className="portal-resources-section">
        <h2 className="portal-resources-section-title portal-resources-section-title--tight">
          Your counselor
        </h2>
        <div className="portal-resources-counselor-card">
          {counselorContact ? (
            <>
              <p className="portal-resources-counselor-name">{counselorContact.fullName}</p>
              <p className="portal-resources-counselor-email">
                <a href={`mailto:${counselorContact.email}`}>{counselorContact.email}</a>
              </p>
              <p className="portal-resources-counselor-body">
                Message your counselor anytime from{' '}
                <Link href="/dashboard/messages" className="portal-resources-inline-em">
                  Messages
                </Link>
                . Scheduling tools will be added here when available.
              </p>
            </>
          ) : (
            <p className="portal-resources-counselor-body--plain">
              A counselor will be assigned as you move through enrollment. For now, reach the team through{' '}
              <Link href="/dashboard/messages" className="portal-resources-inline-em">
                Messages
              </Link>{' '}
              or <a href="mailto:info@workforceap.org">info@workforceap.org</a>.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
