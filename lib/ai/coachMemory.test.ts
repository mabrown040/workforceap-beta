import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendCoachMemoryToSystemPrompt,
  formatCoachTranscript,
  takeLastCoachExchanges,
} from './coachMemory';

test('takeLastCoachExchanges keeps only the last N turns', () => {
  const turns = Array.from({ length: 12 }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'agent') as 'user' | 'agent',
    text: `line ${i}`,
  }));
  const last = takeLastCoachExchanges(turns, 8);
  assert.equal(last.length, 8);
  assert.equal(last[0]?.text, 'line 4');
  assert.equal(last[7]?.text, 'line 11');
});

test('formatCoachTranscript labels coach and member', () => {
  const text = formatCoachTranscript([
    { role: 'agent', text: 'What is your goal?' },
    { role: 'user', text: 'Land a PM role.' },
  ]);
  assert.match(text, /Coach: What is your goal\?/);
  assert.match(text, /Member: Land a PM role\./);
});

test('appendCoachMemoryToSystemPrompt leaves prompt unchanged when summary empty', () => {
  const base = 'You are a coach.';
  assert.equal(appendCoachMemoryToSystemPrompt(base, null), base);
  assert.equal(appendCoachMemoryToSystemPrompt(base, '   '), base);
});

test('appendCoachMemoryToSystemPrompt appends prior context block', () => {
  const out = appendCoachMemoryToSystemPrompt('You are a coach.', 'Focused on resume.');
  assert.match(out, /Prior coaching context/);
  assert.match(out, /Focused on resume\./);
});
