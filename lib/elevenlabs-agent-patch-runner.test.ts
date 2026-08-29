import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  agentPatchMatches,
  findAgentPatchMismatches,
} from '../scripts/elevenlabs/agent-patch-utils.mjs';

test('agent patch verification asserts only checked-in fields', () => {
  const expected = {
    name: 'Lilley',
    conversation_config: { tts: { voice_id: 'matilda' } },
  };
  const actual = {
    agent_id: 'server-managed',
    name: 'Lilley',
    conversation_config: {
      tts: { voice_id: 'matilda', model_id: 'eleven_flash_v2_5' },
    },
  };

  assert.equal(agentPatchMatches(actual, expected), true);
  assert.deepEqual(findAgentPatchMismatches(actual, expected), []);
});

test('agent patch verification reports field paths without response contents', () => {
  const mismatches = findAgentPatchMismatches(
    { conversation_config: { tts: { voice_id: 'wrong' } } },
    { conversation_config: { tts: { voice_id: 'matilda' } } },
  );
  assert.deepEqual(mismatches, ['conversation_config.tts.voice_id']);
});

test('ElevenLabs runner performs a GET verification and never logs response bodies', async () => {
  const source = await readFile(
    join(process.cwd(), 'scripts', 'elevenlabs', 'apply-agent-patches.mjs'),
    'utf8',
  );
  assert.match(source, /method: 'PATCH'/);
  assert.match(source, /const getResponse = await fetch\(url/);
  assert.match(source, /findAgentPatchMismatches\(liveAgent, body\)/);
  assert.doesNotMatch(source, /response\.text\(|text\.slice\(/);
});

test('ElevenLabs writes require one explicit agent and broad mode is verify-only', async () => {
  const source = await readFile(
    join(process.cwd(), 'scripts', 'elevenlabs', 'apply-agent-patches.mjs'),
    'utf8',
  );
  assert.match(source, /allAgents && !checkOnly/);
  assert.match(source, /!requestedAgentId && !\(checkOnly && allAgents\)/);
  assert.match(source, /file === `\$\{requestedAgentId\}\.patch\.json`/);

  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    packageJson.scripts?.['elevenlabs:verify-agents'],
    'node scripts/elevenlabs/apply-agent-patches.mjs --check --all',
  );
});
