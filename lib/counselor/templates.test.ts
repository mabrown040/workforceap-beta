import { describe, it, expect } from 'vitest';
import {
  getFollowUpTemplate,
  renderFollowUpTemplate,
  templateMatchesFlags,
} from '@/lib/counselor/templates';

describe('counselor follow-up templates', () => {
  it('renders placeholders', () => {
    const tpl = getFollowUpTemplate('doc_missing_nudge');
    expect(tpl).not.toBeNull();
    const out = renderFollowUpTemplate(tpl!, {
      memberName: 'Alex Rivera',
      programName: 'IT Support',
    });
    expect(out.body).toContain('Alex Rivera');
    expect(out.body).toContain('IT Support');
  });

  it('matches flags for template filtering', () => {
    const tpl = getFollowUpTemplate('application_stalled');
    expect(tpl).not.toBeNull();
    expect(templateMatchesFlags(tpl!, ['application_stalled'])).toBe(true);
    expect(templateMatchesFlags(tpl!, ['doc_missing'])).toBe(false);
  });
});
