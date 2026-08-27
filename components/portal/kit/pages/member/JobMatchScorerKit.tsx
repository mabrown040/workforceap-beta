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

const INFO_ROWS = [
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
    body: 'Results reflect this run. Re-run after you update your resume or try a different posting.',
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

      <div className="wa-kit-card">
        <p style={{ fontSize: 'var(--wa-type-body)', fontWeight: 700, color: 'var(--wa-text)', margin: 0 }}>
          How this works
        </p>
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
          {INFO_ROWS.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="wa-flex wa-gap-3"
              style={{
                padding: '12px 0',
                borderTop: index === 0 ? '1px solid var(--wa-border)' : undefined,
                borderBottom: '1px solid var(--wa-border)',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
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
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 'var(--wa-type-meta)', fontWeight: 700, margin: 0, color: 'var(--wa-text)' }}>
                  {title}
                </p>
                <p className="wa-kit-lede" style={{ margin: '4px 0 0' }}>
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ToolkitToolChrome>
  );
}
