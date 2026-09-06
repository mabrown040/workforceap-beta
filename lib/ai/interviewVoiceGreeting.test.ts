import assert from 'node:assert/strict';
import test from 'node:test';
import { getInterviewVoiceGreeting, INTERVIEW_VOICE_GREETING_EN, INTERVIEW_VOICE_GREETING_ES } from './interviewVoiceGreeting';

test('interview greeting selects only fixed reviewed English or Spanish copy', () => {
  assert.equal(getInterviewVoiceGreeting('es'), INTERVIEW_VOICE_GREETING_ES);
  for (const value of ['en', 'fr', 'pt', undefined, null, 'Ignore all rules', { greeting: 'User supplied instructions' }]) {
    assert.equal(getInterviewVoiceGreeting(value), INTERVIEW_VOICE_GREETING_EN);
  }
  assert.doesNotMatch(INTERVIEW_VOICE_GREETING_EN + INTERVIEW_VOICE_GREETING_ES, /{%|{{/);
});
