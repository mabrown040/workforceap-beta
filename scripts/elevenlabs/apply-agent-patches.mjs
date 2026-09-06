#!/usr/bin/env node
/**
 * Apply ConvAI agent prompt patches from JSON files (no secrets in repo).
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=agent_... ELEVENLABS_LILLEY_BRANCH_ID=... node scripts/elevenlabs/apply-agent-patches.mjs
 *   ELEVENLABS_API_KEY=... ELEVENLABS_LILLEY_BRANCH_ID=... node scripts/elevenlabs/apply-agent-patches.mjs --check --all
 *
 * Patches: scripts/elevenlabs/patches/*.json each file name is agent_id.patch.json
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  findAgentPatchMismatches,
  findAgentPreimageDrift,
  findAgentPostPatchDrift,
  expectedAgentAfterPatch,
  isSupportedAgentPatch,
} from './agent-patch-utils.mjs';
import {
  findVoiceAgentSecurityIssues,
  REVIEWED_VOICE_AGENT_IDS,
} from './agent-security-policy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATCH_DIR = join(__dirname, 'patches');
const API = 'https://api.elevenlabs.io/v1';
export const REQUEST_TIMEOUT_MS = 15_000;
export const GOVERNED_LILLEY_AGENT_ID =
  'agent_1101kqfjfm8retm8j6md467wzxdb';
const PROVIDER_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const DEFAULT_LOGGER = {
  error: (...values) => console.error(...values),
  log: (...values) => console.log(...values),
};

function requestFailureCode(error) {
  return error?.name === 'AbortError' || error?.name === 'TimeoutError'
    ? 'TIMEOUT'
    : 'NETWORK_ERROR';
}

async function providerRequest({
  fetchImpl,
  url,
  init,
  timeoutMs,
  logger,
  phase,
  agentId,
}) {
  try {
    return await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    logger.error(`${phase}_FAILED`, agentId, requestFailureCode(error));
    return null;
  }
}

async function readProviderJson(response, logger, phase, agentId) {
  try {
    return await response.json();
  } catch {
    logger.error(`${phase}_FAILED`, agentId, 'INVALID_JSON');
    return null;
  }
}

function validatePatch(body) {
  if (!isSupportedAgentPatch(body)) return false;
  for (const field of ['conversation_config', 'platform_settings', 'workflow']) {
    if (
      Object.prototype.hasOwnProperty.call(body, field) &&
      (!body[field] || typeof body[field] !== 'object' || Array.isArray(body[field]))
    ) {
      return false;
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(body, 'name') &&
    body.name !== null &&
    typeof body.name !== 'string'
  ) {
    return false;
  }
  return (
    !Object.prototype.hasOwnProperty.call(body, 'tags') ||
    body.tags === null ||
    (Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === 'string'))
  );
}

function resolvePinnedBranchId(agentId, branchId, logger) {
  if (agentId !== GOVERNED_LILLEY_AGENT_ID) return undefined;
  const normalized = branchId?.trim();
  if (!normalized) {
    logger.error('BRANCH_ID_REQUIRED', agentId);
    return null;
  }
  if (!PROVIDER_IDENTIFIER.test(normalized)) {
    logger.error('BRANCH_ID_INVALID', agentId);
    return null;
  }
  return normalized;
}

function provesPinnedMainBranch(agent, agentId, branchId) {
  return (
    agent?.agent_id === agentId &&
    agent?.branch_id === branchId &&
    agent?.main_branch_id === branchId
  );
}

export async function applyAgentPatch({
  agentId,
  body,
  key,
  checkOnly = false,
  branchId = /** @type {string | undefined} */ (undefined),
  fetchImpl = fetch,
  apiBase = API,
  timeoutMs = REQUEST_TIMEOUT_MS,
  logger = DEFAULT_LOGGER,
}) {
  if (!validatePatch(body)) {
    logger.error('INVALID_PATCH', agentId);
    return false;
  }

  const pinnedBranchId = resolvePinnedBranchId(agentId, branchId, logger);
  if (pinnedBranchId === null) return false;

  const baseUrl = `${apiBase}/convai/agents/${encodeURIComponent(agentId)}`;
  const url = pinnedBranchId
    ? `${baseUrl}?branch_id=${encodeURIComponent(pinnedBranchId)}`
    : baseUrl;
  const preflightResponse = await providerRequest({
    fetchImpl,
    url,
    init: { headers: { 'xi-api-key': key } },
    timeoutMs,
    logger,
    phase: 'PREFLIGHT_GET',
    agentId,
  });
  if (!preflightResponse) return false;
  if (!preflightResponse.ok) {
    logger.error('PREFLIGHT_GET_FAILED', agentId, preflightResponse.status);
    return false;
  }
  const liveAgent = await readProviderJson(
    preflightResponse,
    logger,
    'PREFLIGHT_GET',
    agentId,
  );
  if (!liveAgent) return false;
  if (
    pinnedBranchId &&
    !provesPinnedMainBranch(liveAgent, agentId, pinnedBranchId)
  ) {
    logger.error('BRANCH_PIN_MISMATCH', agentId);
    return false;
  }

  if (REVIEWED_VOICE_AGENT_IDS.has(agentId)) {
    const securityIssues = findVoiceAgentSecurityIssues(
      checkOnly ? liveAgent : expectedAgentAfterPatch(liveAgent, body),
    );
    if (securityIssues.length > 0) {
      logger.error('UNSAFE_AGENT_CONFIGURATION', agentId, securityIssues.join(','));
      return false;
    }
  }

  if (checkOnly) {
    const mismatches = findAgentPatchMismatches(liveAgent, body);
    if (mismatches.length > 0) {
      logger.error('VERIFY_FAILED', agentId, mismatches.slice(0, 20).join(','));
      return false;
    }
    logger.log('VERIFIED', agentId);
    return true;
  }

  if (liveAgent?.access_info?.is_creator !== true) {
    logger.error('OWNERSHIP_REQUIRED', agentId);
    return false;
  }

  // Capture a detached in-memory preimage before the first write. Provider
  // response bodies are never logged or persisted by this runner.
  const preimage = structuredClone(liveAgent);
  const patchResponse = await providerRequest({
    fetchImpl,
    url,
    init: {
      method: 'PATCH',
      headers: {
        'xi-api-key': key,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
    logger,
    phase: 'PATCH',
    agentId,
  });
  if (patchResponse && !patchResponse.ok) {
    logger.error('PATCH_FAILED', agentId, patchResponse.status);
  }

  // A non-2xx, timeout, or network failure is not proof that the write did not
  // happen. Reconcile every write outcome from one fresh provider read. There
  // is deliberately no automatic rollback: ElevenLabs has no compare-and-swap
  // guard, so a second PATCH could overwrite a concurrent human/provider edit.
  const getResponse = await providerRequest({
    fetchImpl,
    url,
    init: { headers: { 'xi-api-key': key } },
    timeoutMs,
    logger,
    phase: 'POST_PATCH_GET',
    agentId,
  });
  let postPatchAgent = null;
  if (getResponse?.ok) {
    postPatchAgent = await readProviderJson(
      getResponse,
      logger,
      'POST_PATCH_GET',
      agentId,
    );
  } else if (getResponse) {
    logger.error('POST_PATCH_GET_FAILED', agentId, getResponse.status);
  }

  if (!postPatchAgent) {
    logger.error('MANUAL_RECOVERY_REQUIRED', agentId);
    return false;
  }
  if (
    pinnedBranchId &&
    !provesPinnedMainBranch(postPatchAgent, agentId, pinnedBranchId)
  ) {
    logger.error('BRANCH_PIN_MISMATCH', agentId);
    logger.error('MANUAL_RECOVERY_REQUIRED', agentId);
    return false;
  }

  const desiredDrift = findAgentPostPatchDrift(postPatchAgent, preimage, body);
  if (desiredDrift.length === 0) {
    logger.log(
      patchResponse?.ok ? 'APPLIED_AND_VERIFIED' : 'APPLIED_AND_RECONCILED',
      agentId,
    );
    return true;
  }

  const preimageDrift = findAgentPreimageDrift(postPatchAgent, preimage);
  if (preimageDrift.length === 0) {
    logger.error('PATCH_NOT_APPLIED', agentId);
    return false;
  }

  logger.error('VERIFY_FAILED', agentId, desiredDrift.slice(0, 20).join(','));
  logger.error('MANUAL_RECOVERY_REQUIRED', agentId);
  return false;
}

export async function runCli() {
  const checkOnly = process.argv.includes('--check');
  const allAgents = process.argv.includes('--all');
  const requestedAgentId = process.env.ELEVENLABS_AGENT_ID?.trim() ?? '';
  const lilleyBranchId = process.env.ELEVENLABS_LILLEY_BRANCH_ID;

  if (allAgents && !checkOnly) {
    console.error('--all is read-only and requires --check');
    return 1;
  }
  if (allAgents && requestedAgentId) {
    console.error('Choose ELEVENLABS_AGENT_ID or --all, not both');
    return 1;
  }
  if (!requestedAgentId && !(checkOnly && allAgents)) {
    console.error('Set ELEVENLABS_AGENT_ID explicitly; broad reads require --check --all');
    return 1;
  }

  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    console.error('Set ELEVENLABS_API_KEY');
    return 1;
  }

  const files = (await readdir(PATCH_DIR)).filter((file) => {
    if (!file.endsWith('.json')) return false;
    return allAgents || file === `${requestedAgentId}.patch.json`;
  });
  if (!files.length) {
    console.error('No patch JSON files in', PATCH_DIR);
    return 1;
  }

  let failed = false;
  for (const file of files) {
    const match = file.match(/^(agent_[^.]+)\.patch\.json$/);
    if (!match) {
      console.warn('Skip (bad name):', file);
      continue;
    }
    const agentId = match[1];
    let body;
    try {
      body = JSON.parse(await readFile(join(PATCH_DIR, file), 'utf8'));
    } catch {
      console.error('PATCH_FILE_INVALID', agentId);
      failed = true;
      continue;
    }
    const succeeded = await applyAgentPatch({
      agentId,
      body,
      key,
      checkOnly,
      ...(agentId === GOVERNED_LILLEY_AGENT_ID
        ? { branchId: lilleyBranchId }
        : {}),
    });
    if (!succeeded) failed = true;
  }
  return failed ? 1 : 0;
}

const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      console.error('RUNNER_FAILED');
      process.exitCode = 1;
    });
}
