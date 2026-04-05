#!/usr/bin/env node
/**
 * Apply ConvAI agent prompt patches from JSON files (no secrets in repo).
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... node scripts/elevenlabs/apply-agent-patches.mjs
 *
 * Patches: scripts/elevenlabs/patches/*.json each file name is agent_id.patch.json
 * Body: { "conversation_config": { "agent": { "first_message": "...", "prompt": { "prompt": "..." } } } }
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATCH_DIR = join(__dirname, 'patches');
const API = 'https://api.elevenlabs.io/v1';

const key = process.env.ELEVENLABS_API_KEY?.trim();
if (!key) {
  console.error('Set ELEVENLABS_API_KEY');
  process.exit(1);
}

async function main() {
  const files = (await readdir(PATCH_DIR)).filter((f) => f.endsWith('.json'));
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
    const body = await readFile(join(PATCH_DIR, file), 'utf8');
    const url = `${API}/convai/agents/${encodeURIComponent(agentId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'xi-api-key': key,
        'content-type': 'application/json; charset=utf-8',
      },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('FAIL', agentId, res.status, text.slice(0, 500));
      process.exitCode = 1;
      continue;
    }
    console.log('OK', agentId, file);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
