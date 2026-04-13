import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendVoiceTranscriptTurn,
  buildInterviewQaFromVoiceTurns,
  extractVoiceTranscriptTurn,
} from './voiceTranscript';

test('extractVoiceTranscriptTurn reads normalized ElevenLabs SDK messages', () => {
  const userTurn = extractVoiceTranscriptTurn({
    role: 'user',
    message: 'I led the migration project.',
    source: 'user',
  });
  const agentTurn = extractVoiceTranscriptTurn({
    role: 'agent',
    message: 'Tell me about a time you handled conflict.',
    source: 'ai',
  });

  assert.deepEqual(userTurn, { role: 'user', text: 'I led the migration project.' });
  assert.deepEqual(agentTurn, { role: 'agent', text: 'Tell me about a time you handled conflict.' });
});

test('extractVoiceTranscriptTurn falls back to raw event payloads', () => {
  const userTurn = extractVoiceTranscriptTurn({
    type: 'user_transcript',
    user_transcription_event: { user_transcript: 'I improved response times by 30%.' },
  });
  const agentTurn = extractVoiceTranscriptTurn({
    type: 'agent_response',
    agent_response_event: { agent_response: 'How do you prioritize work?' },
  });

  assert.deepEqual(userTurn, { role: 'user', text: 'I improved response times by 30%.' });
  assert.deepEqual(agentTurn, { role: 'agent', text: 'How do you prioritize work?' });
});

test('appendVoiceTranscriptTurn skips empty and duplicate consecutive turns', () => {
  const turns = appendVoiceTranscriptTurn([], { role: 'agent', text: 'Question 1' });
  const withDuplicate = appendVoiceTranscriptTurn(turns, { role: 'agent', text: 'Question 1' });
  const withEmpty = appendVoiceTranscriptTurn(withDuplicate, { role: 'user', text: '   ' });
  const withAnswer = appendVoiceTranscriptTurn(withEmpty, { role: 'user', text: 'Answer 1' });

  assert.deepEqual(withAnswer, [
    { role: 'agent', text: 'Question 1' },
    { role: 'user', text: 'Answer 1' },
  ]);
});

test('buildInterviewQaFromVoiceTurns pairs agent prompts with user answers', () => {
  const qa = buildInterviewQaFromVoiceTurns([
    { role: 'agent', text: 'Tell me about yourself.' },
    { role: 'user', text: 'I am a support engineer moving into cloud.' },
    { role: 'agent', text: 'Describe a challenge you solved.' },
    { role: 'user', text: 'I automated a manual reporting process.' },
  ]);

  assert.deepEqual(qa.questions, [
    'Tell me about yourself.',
    'Describe a challenge you solved.',
  ]);
  assert.deepEqual(qa.answers, [
    'I am a support engineer moving into cloud.',
    'I automated a manual reporting process.',
  ]);
});
