import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLinkedInEnrichmentInputSummary,
  findRecentLinkedInEnrichment,
  LINKEDIN_ENRICH_COOLDOWN_MS,
} from './_linkedinEnrich';

test('findRecentLinkedInEnrichment keys cooldown by user and canonical LinkedIn URL', async () => {
  const now = new Date('2026-06-14T12:00:00.000Z');
  const linkedinUrl = 'https://www.linkedin.com/in/member/';
  let receivedArgs: unknown;
  const expectedRow = {
    id: 'ai-1',
    output: JSON.stringify({ skills: [{ name: 'SQL' }, { name: 'Excel' }] }),
  };

  const tx = {
    aIToolResult: {
      findFirst: async (args: unknown) => {
        receivedArgs = args;
        return expectedRow;
      },
    },
  };

  const row = await findRecentLinkedInEnrichment(tx as any, 'user-1', linkedinUrl, now);

  assert.equal(row, expectedRow);
  assert.deepEqual(receivedArgs, {
    where: {
      userId: 'user-1',
      toolType: 'skill_assessment',
      inputSummary: buildLinkedInEnrichmentInputSummary(linkedinUrl),
      createdAt: { gte: new Date(now.getTime() - LINKEDIN_ENRICH_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
});

test('buildLinkedInEnrichmentInputSummary preserves exact URL for duplicate detection', () => {
  assert.equal(
    buildLinkedInEnrichmentInputSummary('https://linkedin.com/in/example/'),
    'LinkedIn enrichment: https://linkedin.com/in/example/',
  );
});
