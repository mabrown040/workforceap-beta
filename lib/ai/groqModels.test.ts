import assert from 'node:assert/strict';
import test from 'node:test';
import { orderGroqModels } from './groq';

test('orderGroqModels: preferred ids that exist come first, in preference order', () => {
  const live = ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'some/new-chat-model'];
  assert.deepEqual(orderGroqModels(live, ['llama-3.3-70b-versatile', 'qwen/qwen3-32b']), [
    'llama-3.3-70b-versatile',
    'qwen/qwen3-32b',
    'some/new-chat-model',
  ]);
});

test('orderGroqModels: a fully retired preferred list still yields the live chat models', () => {
  // The production outage: every hardcoded id 404'd. Discovery must not be
  // empty just because none of the preferences survive.
  const live = ['vendor/brand-new-70b', 'vendor/brand-new-8b'];
  assert.deepEqual(orderGroqModels(live, ['llama-3.1-8b-instant']), [
    'vendor/brand-new-70b',
    'vendor/brand-new-8b',
  ]);
});

test('orderGroqModels: never selects audio, safety or embedding models', () => {
  const live = [
    'whisper-large-v3',
    'playai-tts',
    'meta-llama/llama-guard-4-12b',
    'llama-prompt-guard-2-86m',
    'llama-3.3-70b-versatile',
  ];
  assert.deepEqual(orderGroqModels(live), ['llama-3.3-70b-versatile']);
});

test('orderGroqModels: empty live list yields empty (caller falls back to static list)', () => {
  assert.deepEqual(orderGroqModels([]), []);
});
