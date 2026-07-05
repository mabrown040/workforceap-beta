import { FlaskConical, ShieldCheck, Info, GitCompareArrows as CompareIcon } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { DesignSurface, SectionHeader, CardHead } from '@/components/portal/kit';
import JobMatchScorerForm from '@/components/portal/tools/JobMatchScorerForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

/**
 * Member Portal — JOB MATCH SCORER tool page.
 * Command Center reskin of the page chrome around the existing
 * `JobMatchScorerForm` client component (scoring / gap analysis logic
 * untouched).
 *
 * Target route: app/(portal)/dashboard/ai-tools/job-match-scorer
 * Surface: warm (member-facing).
 */

const INFO_TILES = [
  {
    icon: FlaskConical,
    title: 'Methodology',
    body: 'Keyword overlap, semantic similarity, and role-relevant weighting produce an actionable compatibility score.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy',
    body: 'Job text and resume content are processed for this session. Copy or export results before you leave the page if you need to keep them.',
  },
  {
    icon: Info,
    title: 'Session',
    body: "Results reflect this run's inputs. Re-run after you update your resume or try a different posting.",
  },
];

export function JobMatchScorerKit({ userId }: { userId: string }) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <SectionHeader
          kicker="Career Toolkit"
          title="Job Match Scorer"
          goal="Paste a job description and your resume. Get a match score and specific gaps to address."
        />

        <Card>
          <CardHead title="Analysis" />
          <div className="wa-flex wa-items-center wa-gap-2" style={{ marginTop: -6, marginBottom: 14 }}>
            <CompareIcon size={13} aria-hidden="true" style={{ color: 'var(--wa-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--wa-muted)' }}>Resume vs. job description</span>
          </div>
          <JobMatchScorerForm />
        </Card>

        <ToolHistoryPanel userId={userId} toolType="job_match_scorer" />

        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
          {INFO_TILES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <div className="wa-flex wa-items-center wa-gap-2" style={{ marginBottom: 8 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--wa-radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--wa-accent-soft)',
                    color: 'var(--wa-accent)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} aria-hidden="true" />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--wa-text)' }}>{title}</h3>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--wa-muted)', margin: 0 }}>{body}</p>
            </Card>
          ))}
        </div>
      </div>
    </DesignSurface>
  );
}
