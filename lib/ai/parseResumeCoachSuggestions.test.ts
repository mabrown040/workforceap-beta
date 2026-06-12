import assert from 'node:assert/strict';
import test from 'node:test';

import { parseResumeCoachSuggestionsFromTranscript } from './parseResumeCoachSuggestions';

test('parseResumeCoachSuggestionsFromTranscript returns heuristic suggestions when AI chat throws', async (t) => {
  t.mock.method(console, 'error', () => {});

  const suggestions = await parseResumeCoachSuggestionsFromTranscript(
    [
      {
        speaker: 'agent',
        text: 'Change "did work" to "delivered measurable outcomes" on your resume.',
      },
    ],
    {
      aiChat: async () => {
        throw new Error('AI unavailable');
      },
    }
  );

  assert.deepEqual(suggestions, [
    {
      original: 'did work',
      suggested: 'delivered measurable outcomes',
      context: 'Suggested by resume coach',
    },
  ]);
});
