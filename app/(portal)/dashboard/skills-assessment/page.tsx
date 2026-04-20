import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buildPageMetadata } from '@/app/seo';
import SkillAssessmentForm from '@/components/portal/tools/SkillAssessmentForm';
import AssessmentRetakeButton from '@/components/portal/AssessmentRetakeButton';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Skills Assessment',
  description: 'View your assessment status, skill portfolio, and career readiness.',
  path: '/dashboard/skills-assessment',
});

type SavedSkillSnapshot = {
  id: string;
  savedAt: string;
  occupationTitle: string;
  occupationCode: string;
  radarAxes: Array<{ axis: string; value: number; maxValue: number; hasData?: boolean }>;
  topSkills: Array<{ name: string; score: number; category: string }>;
};

export default async function SkillsAssessmentPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/skills-assessment');

  const [dbUser, certs, savedSnapshots] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id, deletedAt: null },
      select: {
        assessmentCompleted: true,
        assessmentCompletedAt: true,
        assessmentScorePct: true,
        assessmentScore: true,
        enrolledProgram: true,
        interviewCompletedAt: true,
      },
    }),
    prisma.userCertification.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'desc' },
      select: { id: true, certName: true, earnedAt: true },
    }),
    prisma.aIToolResult.findMany({
      where: { userId: user.id, toolType: 'skill_assessment' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, createdAt: true, output: true },
    }),
  ]);

  if (!dbUser) redirect('/login');

  const completed = dbUser.assessmentCompleted ?? false;
  const assessmentGated = !completed && dbUser.interviewCompletedAt == null;

  // Parse saved skill snapshots
  const parsedSnapshots: SavedSkillSnapshot[] = savedSnapshots.flatMap((row) => {
    try {
      const data = JSON.parse(row.output as string);
      return [{
        id: row.id,
        savedAt: row.createdAt.toISOString(),
        occupationTitle: data.occupationTitle ?? 'Unknown occupation',
        occupationCode: data.occupationCode ?? '',
        radarAxes: Array.isArray(data.radarAxes) ? data.radarAxes.slice(0, 6) : [],
        topSkills: Array.isArray(data.skills) ? data.skills.slice(0, 6) : [],
      }];
    } catch {
      return [];
    }
  });

  const latestSnapshot = parsedSnapshots[0] ?? null;

  return (
    <>
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '0 1rem 4rem' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <PortalBreadcrumb
            items={[
              { href: '/dashboard', label: 'Member Portal' },
              { label: 'Skills Assessment' },
            ]}
          />
        </nav>

        {/* Header */}
        <header style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
            Skills &amp; Readiness
          </p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
            Skills Assessment
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
            Your skills snapshot helps personalize your learning path and connect you with career support.
          </p>
        </header>

        {/* ── Assessment Status Card ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
            {assessmentGated ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-on-surface-variant)', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden="true">lock</span>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>
                    Assessment opens after your intake interview
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                    Your counselor uses the interview to confirm fit and next steps. After that conversation is complete, you can take the skills snapshot here.
                  </p>
                  <Link href="/dashboard" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                    Back to overview
                  </Link>
                </div>
              </div>
            ) : completed ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-green)', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>Assessment complete</h2>
                  <span style={{ marginLeft: 'auto', padding: '0.2rem 0.625rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(74,155,79,0.1)', color: '#166534' }}>
                    Done
                  </span>
                </div>

                {/* Stat row */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {dbUser.assessmentScorePct != null && (
                    <div>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Score</p>
                      <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1 }}>
                        {dbUser.assessmentScorePct}<span style={{ fontSize: '1rem' }}>%</span>
                      </p>
                      {dbUser.assessmentScore != null && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.2rem 0 0' }}>{dbUser.assessmentScore}/90 points</p>
                      )}
                    </div>
                  )}
                  {dbUser.assessmentCompletedAt && (
                    <div>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Completed</p>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                        {new Date(dbUser.assessmentCompletedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {dbUser.enrolledProgram && (
                    <div>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Program</p>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                        {getProgramBySlug(dbUser.enrolledProgram)?.title ?? dbUser.enrolledProgram}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Link href="/dashboard/readiness" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                    View Career Readiness
                  </Link>
                  <Link href="/dashboard/training" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                    Go to Training
                  </Link>
                  <AssessmentRetakeButton />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-on-surface-variant)', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden="true">help_outline</span>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>
                    Take your skills snapshot
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                    A quick 10-minute assessment — finishing this starts your training courses and personalizes your learning plan.
                  </p>
                  <Link href="/dashboard/assessment" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                    Start assessment
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Skill Portfolio (saved O*NET snapshots) ── */}
        {!assessmentGated && latestSnapshot && (
          <section style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Skill Portfolio
              </h2>
              {parsedSnapshots.length > 1 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  {parsedSnapshots.length} saved snapshots
                </span>
              )}
            </div>

            <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', margin: '0 0 0.25rem' }}>
                    {latestSnapshot.occupationCode}
                  </p>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.25rem' }}>
                    {latestSnapshot.occupationTitle}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                    Saved {new Date(latestSnapshot.savedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <Link
                  href={`/dashboard/ai-tools/skill-mapper`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">radar</span>
                  Update in Skill Mapper
                </Link>
              </div>

              {/* Radar axes as horizontal bars */}
              {latestSnapshot.radarAxes.length > 0 && (
                <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                  {latestSnapshot.radarAxes.map((axis) => (
                    <div key={axis.axis} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 40px', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{axis.axis}</span>
                      <div style={{ height: '0.5rem', background: 'var(--surface-container-highest)', borderRadius: '999px', overflow: 'hidden' }}>
                        {axis.hasData !== false && (
                          <div style={{ width: `${axis.value}%`, height: '100%', borderRadius: '999px', background: 'var(--color-accent)' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', textAlign: 'right' }}>
                        {axis.hasData === false ? '—' : `${axis.value}%`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Top skills chips */}
              {latestSnapshot.topSkills.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}>
                    Top skill signals
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {latestSnapshot.topSkills.map((s) => (
                      <span
                        key={s.name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: 'var(--surface-container)',
                          color: 'var(--color-on-surface)',
                          border: '1px solid var(--outline-variant)',
                        }}
                      >
                        {s.name}
                        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{s.score}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Certifications ── */}
        {certs.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Earned Certifications
              </h2>
              <Link href="/dashboard/certifications" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {certs.slice(0, 5).map((cert) => (
                <div key={cert.id} className="portal-card portal-card--flat" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1", flexShrink: 0 }} aria-hidden="true">workspace_premium</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cert.certName}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      Earned {cert.earnedAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ padding: '0.2rem 0.625rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(74,155,79,0.1)', color: '#166534', flexShrink: 0 }}>
                    Verified
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── AI Tools for Skills ── */}
        {!assessmentGated && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
              AI-powered skill tools
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
              {[
                { icon: 'radar', title: 'Skill Mapper', desc: 'Map your skills to any O*NET occupation.', href: '/dashboard/ai-tools/skill-mapper' },
                { icon: 'description', title: 'Resume Rewriter', desc: 'Turn your skills into a polished resume.', href: '/dashboard/ai-tools/resume-rewriter' },
                { icon: 'mic', title: 'Interview Coach', desc: 'Practice answering skill-based questions.', href: '/dashboard/ai-tools/interview-coach' },
                { icon: 'query_stats', title: 'Job Match Scorer', desc: 'See how your skills match a job posting.', href: '/dashboard/ai-tools/job-match-scorer' },
              ].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="portal-quick-action-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="portal-quick-action-item__icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{tool.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="portal-quick-action-item__label">{tool.title}</p>
                    <p className="portal-quick-action-item__desc">{tool.desc}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── O*NET Occupation Lookup ── */}
        {!assessmentGated && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
              Occupation skill lookup
            </h2>
            <SkillAssessmentForm />
          </section>
        )}

        {/* Why we ask */}
        <div
          style={{
            padding: '1.25rem',
            background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
            borderRadius: '0.875rem',
            border: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)',
          }}
        >
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>Why we ask</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
            Your answers help counselors personalize your learning path, recommend certifications, and connect you with job placement resources.
            Results are used only to support your success.
          </p>
        </div>
      </div>

      <MobileBottomNav variant="portal" />
    </>
  );
}
