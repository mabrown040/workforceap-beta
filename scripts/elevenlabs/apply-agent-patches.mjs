#!/usr/bin/env node
/**
 * Apply ConvAI agent prompt patches from JSON files (no secrets in repo).
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=agent_... node scripts/elevenlabs/apply-agent-patches.mjs
 *   ELEVENLABS_API_KEY=... node scripts/elevenlabs/apply-agent-patches.mjs --check --all
 *
 * Patches: scripts/elevenlabs/patches/*.json each file name is agent_id.patch.json
 * Body: { "conversation_config": { "agent": { "first_message": "...", "prompt": { "prompt": "..." } } } }
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAgentPatchMismatches } from './agent-patch-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATCH_DIR = join(__dirname, 'patches');
const API = 'https://api.elevenlabs.io/v1';
const checkOnly = process.argv.includes('--check');
const allAgents = process.argv.includes('--all');
const requestedAgentId = process.env.ELEVENLABS_AGENT_ID?.trim() ?? '';

if (allAgents && !checkOnly) {
  console.error('--all is read-only and requires --check');
  process.exit(1);
}
if (allAgents && requestedAgentId) {
  console.error('Choose ELEVENLABS_AGENT_ID or --all, not both');
  process.exit(1);
}
if (!requestedAgentId && !(checkOnly && allAgents)) {
  console.error('Set ELEVENLABS_AGENT_ID explicitly; broad reads require --check --all');
  process.exit(1);
}

const key = process.env.ELEVENLABS_API_KEY?.trim();
if (!key) {
  console.error('Set ELEVENLABS_API_KEY');
  process.exit(1);
}

async function main() {
  const files = (await readdir(PATCH_DIR)).filter((file) => {
    if (!file.endsWith('.json')) return false;
    return allAgents || file === `${requestedAgentId}.patch.json`;
  });
  if (!files.length) {
    console.error('No patch JSON files in', PATCH_DIR);
    process.exit(1);
  }

  for (const file of files) {
    const m = file.match(/^(agent_[^.]+)\.patch\.json$/);
    if (!m) {
      console.warn('Skip (bad name):', file);
      continue;
    }
    const agentId = m[1];
    const body = JSON.parse(await readFile(join(PATCH_DIR, file), 'utf8'));
    const url = `${API}/convai/agents/${encodeURIComponent(agentId)}`;
    if (!checkOnly) {
      const patchResponse = await fetch(url, {
        method: 'PATCH',
        headers: {
          'xi-api-key': key,
          'content-type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
      });
      if (!patchResponse.ok) {
        console.error('PATCH_FAILED', agentId, patchResponse.status);
        process.exitCode = 1;
        continue;
      }
    }

    // A successful PATCH response is not enough: read the live agent back and
    // prove every checked-in field (including Lilley's voice) actually stuck.
    const getResponse = await fetch(url, {
      headers: { 'xi-api-key': key },
    });
    if (!getResponse.ok) {
      console.error('GET_FAILED', agentId, getResponse.status);
      process.exitCode = 1;
      continue;
    }
    const liveAgent = await getResponse.json();
    const mismatches = findAgentPatchMismatches(liveAgent, body);
    if (mismatches.length > 0) {
      console.error('VERIFY_FAILED', agentId, mismatches.slice(0, 20).join(','));
      process.exitCode = 1;
      continue;
    }
    console.log(checkOnly ? 'VERIFIED' : 'APPLIED_AND_VERIFIED', agentId, file);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
