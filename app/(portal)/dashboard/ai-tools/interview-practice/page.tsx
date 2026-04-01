import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Interview Practice Generator',
  description: 'Generate role-specific interview questions with answer frameworks.',
  path: '/dashboard/ai-tools/interview-practice',
});

export default async function InterviewPracticePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/interview-practice');

  const savedResults = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'interview_practice' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, inputSummary: true, output: true, createdAt: true },
  });

  return (
    <>
      <h1 className="sr-only">Interview Practice</h1>
      {/* ── Mobile section ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← AI Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>psychology</span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Interview Practice
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                Role-specific questions with answer frameworks.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Generate tailored interview questions for any role. Choose behavioral, technical, or case study
              focus and get structured answer frameworks using the STAR method.
            </p>
          </div>

          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem' }}>
            <InterviewPracticeForm />
          </div>

          <InterviewPracticeSaved results={savedResults} />
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── Desktop section ── */}
      <div className="wa-hidden wa-md:wa-block" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* ── Breadcrumb + Header ── */}
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1rem',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Career Suite
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Interview Practice</span>
        </nav>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
          Practice{' '}
          <span style={{ color: 'var(--color-accent)' }}>Session</span>
          {' '}Setup
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
          Configure your mock interview -- choose a role, focus area, and difficulty level.
        </p>
      </div>

      {/* ── Main Layout: 7-col form + 5-col preview ── */}
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: '1.75rem',
          alignItems: 'start',
        }}
      >
        {/* ── Left: Form Section ── */}
        <div>
          {/* Input Fields Card */}
          <div
            className="stitch-card"
            style={{
              padding: '1.75rem',
              borderRadius: 16,
              marginBottom: '1.25rem',
            }}
          >
            {/* Job Title */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>work</span>
                Job Title
              </label>
              <div
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--surface-container-highest)',
                  background: 'var(--surface-container-low)',
                  fontSize: '0.88rem',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                e.g. Senior Product Manager
              </div>
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>apartment</span>
                Company Name
              </label>
              <div
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  border: '1px solid var(--surface-container-highest)',
                  background: 'var(--surface-container-low)',
                  fontSize: '0.88rem',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                e.g. Acme Corp (optional)
              </div>
            </div>

            {/* Focus Area Cards */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-on-surface-variant)',
                  margin: '0 0 0.65rem',
                }}
              >
                Focus Area
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {[
                  { label: 'Behavioral', icon: 'psychology', desc: 'STAR method questions', active: true },
                  { label: 'Technical', icon: 'code', desc: 'Role-specific skills', active: false },
                  { label: 'Case Study', icon: 'analytics', desc: 'Problem-solving scenarios', active: false },
                ].map((area) => (
                  <div
                    key={area.label}
                    style={{
                      padding: '1rem 0.75rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: area.active
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--surface-container-highest)',
                      background: area.active
                        ? 'rgba(173,44,77,0.06)'
                        : 'var(--surface-container-low)',
                      transition: 'border 0.15s, background 0.15s',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '1.6rem',
                        color: area.active ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                        display: 'block',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {area.icon}
                    </span>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {area.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)', marginTop: '0.1rem' }}>
                      {area.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Slider */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>tune</span>
                  Difficulty
                </label>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 4,
                    background: 'rgba(173,44,77,0.10)',
                    color: 'var(--color-accent)',
                  }}
                >
                  Mid-Level
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--surface-container-highest)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: '50%',
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, var(--color-accent), #d4607a)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    border: '3px solid var(--color-surface)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-on-surface-variant)' }}>Entry</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-on-surface-variant)' }}>Senior</span>
              </div>
            </div>
          </div>

          {/* Actual InterviewPracticeForm -- handles submit + API */}
          <div
            className="stitch-card"
            style={{ padding: '1.5rem', borderRadius: 16, marginBottom: '1.25rem' }}
          >
            <InterviewPracticeForm />
          </div>

          {/* ── Bottom Cards: Professional Mode + Archive Badge ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Professional Mode card */}
            <div
              className="stitch-card"
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '100px 1fr',
                background: 'var(--surface-container-low)',
              }}
            >
              {/* Image placeholder */}
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--surface-container-highest), var(--surface-container-high))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', opacity: 0.5 }}>
                  workspace_premium
                </span>
              </div>
              <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.2rem' }}>
                  Professional Mode
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
                  Industry-grade interview simulation with timed responses and follow-up probing.
                </div>
              </div>
            </div>

            {/* Archive Certified Badge */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.75rem 1rem',
                borderRadius: 14,
                background: 'var(--surface-container-high)',
                border: '1px solid var(--surface-container-highest)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: 'var(--color-accent)' }}>
                verified
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'center' }}>
                Archive<br />Certified
              </span>
            </div>
          </div>

          {/* ── CTA Buttons ── */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-accent), #d4607a)',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(173,44,77,0.3)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>play_arrow</span>
              Start Session
            </button>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                padding: '0.75rem 1.25rem',
                borderRadius: 12,
                border: '2px solid var(--surface-container-highest)',
                background: 'transparent',
                color: 'var(--color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>bookmark_border</span>
              Save Setup
            </button>
          </div>
        </div>

        {/* ── Right: Sticky Preview Panel (5-col) ── */}
        <div
          style={{
            position: 'sticky',
            top: '2rem',
          }}
        >
          <div
            className="stitch-card"
            style={{
              padding: '1.5rem',
              borderRadius: 16,
              background: 'var(--surface-container-low)',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.35rem', color: 'var(--color-accent)' }}>
                  preview
                </span>
                Generated Preview
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: 4,
                  background: 'var(--surface-container-highest)',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                5 Questions
              </span>
            </div>

            {/* Sample question items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Tell me about a time you led a cross-functional team through a challenging project.',
                'How do you prioritize competing stakeholder requests?',
                'Describe your approach to data-driven decision making.',
                'Walk me through a product launch you managed end-to-end.',
                'How would you handle a situation where engineering pushes back on a deadline?',
              ].map((q, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem 1rem',
                    borderLeft: '4px solid var(--color-accent)',
                    borderRadius: '0 10px 10px 0',
                    background: 'var(--surface-container)',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    color: 'var(--color-on-surface)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-accent)', marginRight: '0.4rem' }}>
                    Q{i + 1}.
                  </span>
                  {q}
                </div>
              ))}
            </div>

            {/* User count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>group</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>
                1,247 users practiced this week
              </span>
            </div>
          </div>

          {/* Saved results */}
          <InterviewPracticeSaved results={savedResults} />
        </div>
      </div>
    </div>
    </>
  );
}
