import { FlaskConical, ShieldCheck, Info, GitCompareArrows as CompareIcon } from 'lucide-react';
import JobMatchScorerForm from '@/components/portal/tools/JobMatchScorerForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — job match scorer tool page.
 * PageOpener chrome around JobMatchScorerForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/job-match-scorer
 * Surface: warm (member-facing).
 */

const INFO_TILES = [
  {
    icon: FlaskConical,
    title: 'Methodology',
    body: 'Keyword overlap, semantic similarity, and role-relevant weighting produce a compatibility score.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy',
    body: 'Job text and resume content are processed for this session. Copy or export results before you leave if you need to keep them.',
  },
  {
    icon: Info,
    title: 'Session',
    body: "Results reflect this run. Re-run after you update your resume or try a different posting.",
  },
];

export function JobMatchScorerKit({
  userId,
  preview = false,
  backHref,
  initialResume,
  initialJobDescription,
  initialJobUrl,
  previewOutput,
  previewParsed,
  previewError,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialResume?: string;
  initialJobDescription?: string;
  initialJobUrl?: string;
  previewOutput?: string;
  previewError?: string;
  previewParsed?: {
    matchScore: number;
    strengths: string[];
    gaps: string[];
    quickWins: string[];
    rawText: string;
  } | null;
}) {
  return (
    <ToolkitToolChrome
      title="Job match scorer"
      lede="Paste a posting and your resume. Get a score and the gaps to close."
      icon={<CompareIcon size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={1080}
    >
      <div className="wa-kit-card">
        <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Analysis</h2>
        <p style={{ fontSize: 'var(--wa-type-meta)', color: 'var(--wa-muted)', margin: '0 0 14px' }}>Resume vs. job description</p>
        <JobMatchScorerForm
          preview={preview}
          initialResume={initialResume}
          initialJobDescription={initialJobDescription}
          initialJobUrl={initialJobUrl}
          previewOutput={previewOutput}
          previewParsed={previewParsed}
          previewError={previewError}
        />
      </div>

      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="job_match_scorer" /> : null}

      <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
        {INFO_TILES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="wa-kit-card">
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
                  background: 'var(--wa-surface-2)',
                  color: 'var(--wa-accent)',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: 'var(--wa-type-meta)', fontWeight: 700, margin: 0, color: 'var(--wa-text)' }}>{title}</h3>
            </div>
            <p style={{ fontSize: 'var(--wa-type-meta)', lineHeight: 1.55, color: 'var(--wa-muted)', margin: 0 }}>{body}</p>
          </div>
        ))}
      </div>
    </ToolkitToolChrome>
  );
}
