import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendCoachMemoryToSystemPrompt,
  formatCoachTranscript,
  takeLastCoachExchanges,
} from './memory';

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

test('3-turn conversation fixture creates one CoachMemory row', () => {
  const userId = 'fixture-3turn-user';
  const recentTurns = [
    { role: 'agent' as const, text: 'What role are you targeting?' },
    { role: 'user' as const, text: 'Product manager' },
    { role: 'agent' as const, text: 'What is your biggest blocker right now?' },
    { role: 'user' as const, text: 'My resume bullets feel weak' },
    { role: 'agent' as const, text: 'Let us tighten your top three bullets.' },
    { role: 'user' as const, text: 'That would help a lot' },
  ];

  assert.equal(recentTurns.length, 6);
  assert.equal(takeLastCoachExchanges(recentTurns).length, 6);

  const rows = new Map<string, { summary: string; lastTopic: string | null; lastAction: string | null }>();
  rows.set(userId, {
    summary: 'Member targets a PM role and wants help tightening resume bullets.',
    lastTopic: 'resume bullets',
    lastAction: 'Revise top three experience bullets',
  });

  assert.equal(rows.size, 1);
  assert.match(rows.get(userId)!.summary, /PM role|resume bullets/i);
});
