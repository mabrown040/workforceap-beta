import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getResourcesForCategory } from '@/lib/content/programResources';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resources',
  description: 'Career tools and program resources.',
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
  'business': 'Business',
  'healthcare': 'Healthcare',
  'manufacturing': 'Manufacturing',
};

export default async function DashboardResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/resources');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

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
    <>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Resources</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '2rem' }}>
        Career tools and program-specific resources.
      </p>

      {suggestedAiTools.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Suggested for you</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
            Based on your progress — try these AI tools next:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {suggestedAiTools.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                style={{
                  display: 'inline-block',
                  padding: '0.6rem 1rem',
                  background: 'rgba(74, 155, 79, 0.1)',
                  border: '1px solid var(--color-accent)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {a.label} →
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>All AI Career Tools</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
          Resume builder, LinkedIn headline, cover letter, interview practice, and more — powered by AI.
        </p>
        <Link
          href="/dashboard/ai-tools"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-accent)',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}
        >
          Open AI Tools →
        </Link>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Career Tips</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {CAREER_TOOLS.map((t) => (
            <a
              key={t.title}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '1rem',
                border: '1px solid var(--color-border, #e5e5e5)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <strong>{t.title}</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginLeft: '0.5rem' }}>— {t.description}</span>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Program Resources</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
          Filtered for your program category: {CATEGORY_LABELS[category] ?? category}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {getResourcesForCategory(category).map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '1rem',
                border: '1px solid var(--color-border, #e5e5e5)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-light)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{r.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginBottom: '0.5rem' }}>{r.description}</div>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 500 }}>Visit Resource →</span>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Support</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:info@workforceap.org">info@workforceap.org</a>
          </p>
          <p>
            <strong>Phone:</strong> (512) 777-1808
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
            <strong>Loaner Laptop:</strong> Earned upon successful program completion — see{' '}
            <Link href="/how-it-works">How It Works</Link>
          </p>
        </div>
      </section>

      {/* COUNSELOR_DEFERRED — wire to counselor assignment system */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your Counselor</h2>
        <div
          style={{
            padding: '1.5rem',
            border: '1px solid var(--color-border, #e5e5e5)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '1.5rem',
            }}
          >
            ?
          </div>
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              Your counselor will be assigned when your program begins.
            </p>
            <button type="button" className="btn btn-outline" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              Schedule Meeting
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
