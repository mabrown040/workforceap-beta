import test from 'node:test';
import assert from 'node:assert/strict';
import { isAIConfigured } from './configured';

test('isAIConfigured is true when any provider key is set', () => {
  const prev = {
    groq: process.env.GROQ_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  try {
    delete process.env.GROQ_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    assert.equal(isAIConfigured(), false);

    process.env.ANTHROPIC_API_KEY = 'sk-test';
    assert.equal(isAIConfigured(), true);

    delete process.env.ANTHROPIC_API_KEY;
    process.env.GEMINI_API_KEY = 'gemini-test';
    assert.equal(isAIConfigured(), true);

    delete process.env.GEMINI_API_KEY;
    process.env.GROQ_API_KEY = 'gsk-test';
    assert.equal(isAIConfigured(), true);
  } finally {
    if (prev.groq === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prev.groq;
    if (prev.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prev.anthropic;
    if (prev.gemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prev.gemini;
  }
});
