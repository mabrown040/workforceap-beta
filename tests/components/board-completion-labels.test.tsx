import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BoardOutcomesView from '@/components/admin/BoardOutcomesView';
import OutcomesSnapshot from '@/components/admin/OutcomesSnapshot';
import { formatBoardSnapshotMarkdown, formatBoardSnapshotPdf } from '@/lib/admin/boardOutcomes';
import { extractTextFromResumeBuffer } from '@/lib/resume/extractTextFromResumeBuffer';
import { boardSnapshotFixture } from '../fixtures/boardSnapshot';

describe('board training completion and credential wording', () => {
  it('renders completed training without claiming credentials or a promised placement timeline', () => {
    const html = renderToStaticMarkup(<BoardOutcomesView outcomes={boardSnapshotFixture.outcomes}
      programs={boardSnapshotFixture.outcomes.programs.map((program) => ({ ...program, title: 'Fixture training' }))}
      boardName="Synthetic board" />);
    expect(html).toContain('Training completed');
    expect(html).toContain('17 members have completed assigned training');
    expect(html).toContain('Credential verification and job placement are separate milestones');
    expect(html).not.toContain('>Certified<');
    expect(html).not.toContain('4–8 weeks');
  });

  it('keeps the snapshot training count distinct from unfiltered credential records', () => {
    const html = renderToStaticMarkup(<OutcomesSnapshot initialSnapshot={boardSnapshotFixture} initialPeriod="all-time" />);
    expect(html).toContain('Training completed');
    expect(html).toContain('17 completed training');
    expect(html).toContain('Credential records');
    expect(html).toContain('These are not verified-credential totals');
    expect(html).toContain('>23</span>');
    expect(html).not.toContain('>Certified<');
  });

  it('exports training completion and credential records with separate values', () => {
    const markdown = formatBoardSnapshotMarkdown(boardSnapshotFixture);
    expect(markdown).toContain('- Training completed: 17');
    expect(markdown).toContain('| Program | Enrolled | Training completed |');
    expect(markdown).toContain('- Total credential records: 23');
    expect(markdown).toContain('- Reported earned dates in last 30 days: 7');
    expect(markdown).toContain('these are not verified-credential totals');
    expect(markdown).not.toContain('- Certified:');
    expect(boardSnapshotFixture.outcomes.totals.membersCertified).toBe(17);
    expect(boardSnapshotFixture.outcomes.programs[0].certified).toBe(17);
  });

  it('carries the corrected wording and distinct counts into the actual PDF', async () => {
    const pdf = await formatBoardSnapshotPdf(boardSnapshotFixture);
    const text = await extractTextFromResumeBuffer(pdf, 'pdf');
    expect(text).toMatch(/Training completed:\s*17/);
    expect(text).toMatch(/Total credential records:\s*23/);
    expect(text).not.toMatch(/\bCertified:/);
  });
});
