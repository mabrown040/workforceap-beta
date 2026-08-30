import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('contextual messaging link contracts', () => {
  it('routes counselor at-risk actions to the staff inbox instead of the member inbox', () => {
    const modal = source('components/portal/counselor/AtRiskDetailModal.tsx');

    expect(modal).toContain('/counselor/messages?memberId=');
    expect(modal).not.toContain('/dashboard/messages?to=');
  });

  it('keeps priority and partner actions on their role-specific contextual inboxes', () => {
    const priorityQueue = source('components/portal/counselor/CounselorPriorityQueue.tsx');
    const partnerAttention = source('components/partner/PartnerAttentionClient.tsx');

    expect(priorityQueue).toContain('/counselor/messages?thread=');
    expect(partnerAttention).toContain('/partner/messages?memberId=');
  });
});
