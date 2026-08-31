#!/usr/bin/env node
/**
 * Reconcile the three reviewed, read-only Lilley webhook tools.
 *
 * Check (default):
 *   ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=agent_... ELEVENLABS_LILLEY_BRANCH_ID=branch_... pnpm elevenlabs:sync-member-tools
 * Apply explicitly:
 *   ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=agent_... ELEVENLABS_LILLEY_BRANCH_ID=branch_... pnpm elevenlabs:sync-member-tools -- --apply
 *
 * Provider writes are treated as ambiguous until a fresh GET/list proves the
 * post-state. A known preimage is restored only when an acknowledged write is
 * still present exactly; unreadable or third-party drift always stops with a
 * manual-recovery gate and no compensating write. Credentials and provider
 * response bodies are never printed.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {
  assertGovernedToolOwnership,
  assertMemberAgentOwnership,
  buildMemberAgentWebhookToolConfig,
  findAgentToolAttachmentMutationIssues,
  findMemberAgentCapabilityIssues,
  findMemberAgentToolSecurityIssues,
  indexGovernedTools,
  validateMemberAgentToolManifest,
} from './member-agent-tool-sync-utils.mjs';
import { findAgentPatchMismatches } from './agent-patch-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MANIFEST_PATH = join(ROOT, 'config', 'elevenlabs', 'member-agent-tools.v1.json');
const API = 'https://api.elevenlabs.io/v1';
const READ_ATTEMPTS = 3;
const MAX_DEPENDENCY_PAGES = 20;
const SAFE_BRANCH_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export class ProviderReconciliationError extends Error {
  constructor(message, { preserveToolState = false } = {}) {
    super(message);
    this.name = 'ProviderReconciliationError';
    this.preserveToolState = preserveToolState;
  }
}

async function providerFetch(path, key, init = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      'xi-api-key': key,
      ...(init.body ? { 'content-type': 'application/json; charset=utf-8' } : {}),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}

async function readJson(response, operation) {
  if (!response.ok) {
    throw new Error(`${operation} failed with status ${response.status}.`);
  }
  return response.json();
}

async function listCandidateTools(key) {
  const query = new URLSearchParams({
    page_size: '100',
    search: 'get_',
    sort_by: 'name',
    sort_direction: 'asc',
    types: 'webhook',
  });
  const response = await providerFetch(`/convai/tools?${query}`, key);
  const payload = await readJson(response, 'LIST_TOOLS');
  if (
    !payload ||
    !Array.isArray(payload.tools) ||
    typeof payload.has_more !== 'boolean'
  ) {
    throw new Error('Tool listing response is incomplete; refusing reconciliation.');
  }
  if (payload.has_more) {
    throw new Error('Tool listing was paginated; refusing an incomplete reconciliation.');
  }
  return payload.tools;
}

export function requireReviewedBranchId(value) {
  const branchId = typeof value === 'string' ? value.trim() : '';
  if (!SAFE_BRANCH_ID_PATTERN.test(branchId)) {
    throw new Error(
      'Set ELEVENLABS_LILLEY_BRANCH_ID to the reviewed Lilley branch explicitly.',
    );
  }
  return branchId;
}

export function buildReviewedAgentPath(agentId, branchId) {
  const reviewedBranchId = requireReviewedBranchId(branchId);
  const query = new URLSearchParams({ branch_id: reviewedBranchId });
  return `/convai/agents/${encodeURIComponent(agentId)}?${query}`;
}

export function assertReviewedAgentBranch(agent, agentId, branchId) {
  const reviewedBranchId = requireReviewedBranchId(branchId);
  if (
    agent?.agent_id !== agentId ||
    agent?.branch_id !== reviewedBranchId ||
    agent?.main_branch_id !== reviewedBranchId
  ) {
    throw new ProviderReconciliationError(
      `AGENT_BRANCH_MISMATCH ${agentId}: provider readback did not match the reviewed branch.`,
    );
  }
  return agent;
}

export function createProviderClient(key, branchId) {
  return {
    listTools: () => listCandidateTools(key),
    getTool: async (id) => {
      const response = await providerFetch(`/convai/tools/${encodeURIComponent(id)}`, key);
      if (response.status === 404) return null;
      return readJson(response, 'GET_TOOL');
    },
    getToolDependentsPage: async (id, cursor) => {
      const query = new URLSearchParams({ page_size: '100' });
      if (cursor) query.set('cursor', cursor);
      return readJson(
        await providerFetch(
          `/convai/tools/${encodeURIComponent(id)}/dependent-agents?${query}`,
          key,
        ),
        'GET_TOOL_DEPENDENTS',
      );
    },
    createTool: async (toolConfig, responseMocks) =>
      readJson(
        await providerFetch('/convai/tools', key, {
          method: 'POST',
          body: JSON.stringify({
            tool_config: toolConfig,
            response_mocks: responseMocks,
          }),
        }),
        'CREATE_TOOL',
      ),
    updateTool: async (id, toolConfig, responseMocks) =>
      readJson(
        await providerFetch(`/convai/tools/${encodeURIComponent(id)}`, key, {
          method: 'PATCH',
          body: JSON.stringify({
            tool_config: toolConfig,
            response_mocks: responseMocks,
          }),
        }),
        'UPDATE_TOOL',
      ),
    deleteTool: async (id) => {
      const response = await providerFetch(`/convai/tools/${encodeURIComponent(id)}`, key, {
        method: 'DELETE',
      });
      if (response.status === 404) return;
      if (!response.ok) throw new Error(`DELETE_TOOL failed with status ${response.status}.`);
    },
    getAgent: async (agentId) =>
      readJson(
        await providerFetch(buildReviewedAgentPath(agentId, branchId), key),
        'GET_AGENT',
      ),
    patchAgentToolIds: async (agentId, toolIds, versionDescription) =>
      readJson(
        await providerFetch(buildReviewedAgentPath(agentId, branchId), key, {
          method: 'PATCH',
          body: JSON.stringify({
            conversation_config: { agent: { prompt: { tool_ids: toolIds } } },
            version_description: versionDescription,
          }),
        }),
        'PATCH_AGENT_TOOLS',
      ),
  };
}

async function readWithBoundedRetries(operation) {
  let lastError;
  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Provider reconciliation read failed.');
}

export async function readCompleteToolDependencies(provider, toolId) {
  const agents = [];
  const branches = [];
  const seenCursors = new Set();
  let cursor;
  for (let pageNumber = 0; pageNumber < MAX_DEPENDENCY_PAGES; pageNumber += 1) {
    let page;
    try {
      page = await readWithBoundedRetries(() =>
        provider.getToolDependentsPage(toolId, cursor),
      );
    } catch {
      throw new ProviderReconciliationError(
        `MANUAL_RECOVERY_REQUIRED ${toolId}: dependent-agent read failed.`,
      );
    }
    if (
      !page ||
      !Array.isArray(page.agents) ||
      !Array.isArray(page.branches) ||
      typeof page.has_more !== 'boolean'
    ) {
      throw new ProviderReconciliationError(
        `MANUAL_RECOVERY_REQUIRED ${toolId}: dependent-agent response is incomplete.`,
      );
    }
    agents.push(...page.agents);
    branches.push(...page.branches);
    if (!page.has_more) return { agents, branches };
    if (
      typeof page.next_cursor !== 'string' ||
      !page.next_cursor ||
      seenCursors.has(page.next_cursor)
    ) {
      throw new ProviderReconciliationError(
        `MANUAL_RECOVERY_REQUIRED ${toolId}: dependent-agent pagination is incomplete.`,
      );
    }
    seenCursors.add(page.next_cursor);
    cursor = page.next_cursor;
  }
  throw new ProviderReconciliationError(
    `MANUAL_RECOVERY_REQUIRED ${toolId}: dependent-agent pagination exceeded the safety bound.`,
  );
}

export async function assertToolDependencyBoundary(
  provider,
  toolId,
  allowedAgentIds,
  allowedBranchIds = [],
) {
  const dependencies = await readCompleteToolDependencies(provider, toolId);
  const allowed = new Set(allowedAgentIds);
  const allowedBranches = new Set(allowedBranchIds);
  const dependentIds = [];
  for (const agent of dependencies.agents) {
    if (typeof agent?.id !== 'string' || !agent.id) {
      throw new ProviderReconciliationError(
        `MANUAL_RECOVERY_REQUIRED ${toolId}: dependent agent identity is incomplete.`,
      );
    }
    dependentIds.push(agent.id);
  }
  for (const branch of dependencies.branches) {
    if (
      typeof branch?.agent_id !== 'string' ||
      !branch.agent_id ||
      typeof branch?.branch_id !== 'string' ||
      !branch.branch_id ||
      typeof branch?.is_main !== 'boolean'
    ) {
      throw new ProviderReconciliationError(
        `MANUAL_RECOVERY_REQUIRED ${toolId}: dependent branch identity is incomplete.`,
      );
    }
    if (branch.is_main !== true) {
      throw new ProviderReconciliationError(
        `TOOL_DEPENDENCY_BLOCKED ${toolId}: non-main dependent branch ${branch.branch_id}.`,
      );
    }
    if (!allowedBranches.has(branch.branch_id)) {
      throw new ProviderReconciliationError(
        `TOOL_DEPENDENCY_BLOCKED ${toolId}: unreviewed dependent branch ${branch.branch_id}.`,
      );
    }
    dependentIds.push(branch.agent_id);
  }
  const unreviewed = [...new Set(dependentIds)].filter((id) => !allowed.has(id));
  if (unreviewed.length > 0) {
    throw new ProviderReconciliationError(
      `TOOL_DEPENDENCY_BLOCKED ${toolId}: ${unreviewed.length} unreviewed dependent agent(s).`,
    );
  }
  return dependencies;
}

function requireProviderToolId(tool, toolName) {
  if (typeof tool?.id !== 'string' || !tool.id) {
    throw new ProviderReconciliationError(
      `MANUAL_RECOVERY_REQUIRED ${toolName}: provider tool id is unavailable.`,
    );
  }
  return tool.id;
}

function snapshotResponseMocks(value, toolName) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ProviderReconciliationError(
      `TOOL_PREIMAGE_UNSAFE ${toolName}: response mocks cannot be snapshotted.`,
    );
  }
  return structuredClone(value);
}

function hasExactToolState(tool, toolConfig, responseMocks, toolName) {
  try {
    return (
      Boolean(tool) &&
      isDeepStrictEqual(tool.tool_config, toolConfig) &&
      isDeepStrictEqual(snapshotResponseMocks(tool.response_mocks, toolName), responseMocks)
    );
  } catch {
    return false;
  }
}

function manualRecovery(message) {
  return new ProviderReconciliationError(message, { preserveToolState: true });
}

function assertPostWriteToolOwnership(tool, toolName) {
  try {
    assertGovernedToolOwnership(tool, toolName);
  } catch {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${toolName}: post-write ownership cannot be proven.`,
    );
  }
}

async function assertPostWriteDependencyBoundary(
  provider,
  toolId,
  allowedAgentIds,
  allowedBranchIds,
  toolName,
) {
  try {
    return await assertToolDependencyBoundary(
      provider,
      toolId,
      allowedAgentIds,
      allowedBranchIds,
    );
  } catch {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${toolName}: post-write dependency state cannot be proven.`,
    );
  }
}

async function assertReviewedAttachmentDependency(
  provider,
  toolId,
  reviewedAgentId,
  reviewedBranchId,
  toolName,
) {
  const dependencies = await assertPostWriteDependencyBoundary(
    provider,
    toolId,
    [reviewedAgentId],
    [reviewedBranchId],
    toolName,
  );
  const hasReviewedAgent = dependencies.agents.some(
    (agent) => agent?.id === reviewedAgentId,
  );
  const hasReviewedBranch = dependencies.branches.some(
    (branch) =>
      branch?.agent_id === reviewedAgentId &&
      branch?.branch_id === reviewedBranchId &&
      branch?.is_main === true,
  );
  if (!hasReviewedAgent && !hasReviewedBranch) {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${toolName}: reviewed Lilley dependency is missing after attachment.`,
    );
  }
  return dependencies;
}

function assertVerifiedDesiredTool(tool, desired, toolName) {
  requireProviderToolId(tool, toolName);
  assertGovernedToolOwnership(tool, toolName);
  const issues = findMemberAgentToolSecurityIssues(tool, desired);
  if (issues.length > 0) {
    throw new ProviderReconciliationError(
      `VERIFY_TOOL ${toolName} failed: ${issues.slice(0, 12).join(',')}`,
    );
  }
  return tool;
}

async function discoverCreatedTool(provider, desired, toolName) {
  let liveTools;
  try {
    liveTools = await readWithBoundedRetries(() => provider.listTools());
  } catch {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${toolName}: create outcome is ambiguous and listing failed.`,
    );
  }
  const matches = liveTools.filter((tool) => tool?.tool_config?.name === toolName);
  if (matches.length !== 1) {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${toolName}: create outcome is ambiguous (${matches.length} exact-name matches).`,
    );
  }
  return assertVerifiedDesiredTool(matches[0], desired, toolName);
}

export async function rollbackGovernedToolMutations(_provider, mutations) {
  if (mutations.length === 0) return;
  const names = mutations.map((mutation) => mutation.name).join(', ');
  // ElevenLabs does not expose a conditional-write precondition for tool
  // PATCH/DELETE. A read-check-write rollback can therefore overwrite or
  // delete a human/provider edit made after the check. Preserve the observed
  // provider state and require an attended recovery instead.
  throw manualRecovery(
    `MANUAL_RECOVERY_REQUIRED: automatic rollback is disabled for ${names}.`,
  );
}

async function reconcileExistingTool(
  provider,
  desired,
  definition,
  existing,
  reviewedAgentId,
  reviewedBranchId,
  apply,
) {
  const id = requireProviderToolId(existing, definition.name);
  assertGovernedToolOwnership(existing, definition.name);
  const fresh = await readWithBoundedRetries(() => provider.getTool(id));
  if (!fresh) throw new ProviderReconciliationError(`TOOL_MISSING ${definition.name}`);
  assertGovernedToolOwnership(fresh, definition.name);
  const initialIssues = findMemberAgentToolSecurityIssues(fresh, desired);
  if (initialIssues.length === 0) {
    await assertToolDependencyBoundary(
      provider,
      id,
      [reviewedAgentId],
      [reviewedBranchId],
    );
    return { tool: fresh, mutation: null, action: 'verified' };
  }
  if (!apply) {
    throw new Error(`TOOL_DRIFT ${definition.name}: ${initialIssues.slice(0, 12).join(',')}`);
  }

  const mutation = {
    kind: 'updated',
    id,
    name: definition.name,
    beforeToolConfig: structuredClone(fresh.tool_config),
    beforeResponseMocks: snapshotResponseMocks(fresh.response_mocks, definition.name),
    afterToolConfig: structuredClone(desired),
    afterResponseMocks: [],
    writeAcknowledged: false,
    reviewedAgentId,
    reviewedBranchId,
  };

  await assertToolDependencyBoundary(
    provider,
    id,
    [reviewedAgentId],
    [reviewedBranchId],
  );

  let writeFailed = false;
  try {
    await provider.updateTool(id, desired, []);
    mutation.writeAcknowledged = true;
  } catch {
    writeFailed = true;
  }

  let verified;
  try {
    verified = await readWithBoundedRetries(() => provider.getTool(id));
  } catch {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${definition.name}: update outcome cannot be read back.`,
    );
  }
  if (!verified) {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${definition.name}: updated tool is missing after write.`,
    );
  }
  assertPostWriteToolOwnership(verified, definition.name);
  if (hasExactToolState(verified, desired, [], definition.name)) {
    try {
      assertVerifiedDesiredTool(verified, desired, definition.name);
      await assertPostWriteDependencyBoundary(
        provider,
        id,
        [reviewedAgentId],
        [reviewedBranchId],
        definition.name,
      );
      return { tool: verified, mutation, action: writeFailed ? 'reconciled' : 'updated' };
    } catch {
      throw manualRecovery(
        `MANUAL_RECOVERY_REQUIRED ${definition.name}: desired state failed post-write verification.`,
      );
    }
  }
  if (
    hasExactToolState(
      verified,
      mutation.beforeToolConfig,
      mutation.beforeResponseMocks,
      definition.name,
    )
  ) {
    throw new ProviderReconciliationError(
      `UPDATE_TOOL ${definition.name} did not apply; original preimage remains.`,
    );
  }
  throw manualRecovery(
    `MANUAL_RECOVERY_REQUIRED ${definition.name}: concurrent or unexpected state after update.`,
  );
}

async function reconcileMissingTool(provider, desired, definition, apply) {
  if (!apply) throw new Error(`MISSING_TOOL ${definition.name}`);
  let created;
  let writeFailed = false;
  try {
    created = await provider.createTool(desired, []);
  } catch {
    writeFailed = true;
  }

  let candidate = created;
  if (typeof candidate?.id !== 'string' || !candidate.id) {
    candidate = await discoverCreatedTool(provider, desired, definition.name);
  }
  const id = requireProviderToolId(candidate, definition.name);
  const mutation = {
    kind: 'created',
    id,
    name: definition.name,
    createdToolConfig: structuredClone(desired),
    createdResponseMocks: [],
  };
  let verified;
  try {
    verified = await readWithBoundedRetries(() => provider.getTool(id));
  } catch {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${definition.name}: created tool cannot be read back.`,
    );
  }
  if (!verified) {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${definition.name}: created tool was not present during verification.`,
    );
  }
  let tool;
  try {
    tool = assertVerifiedDesiredTool(verified, desired, definition.name);
  } catch {
    throw manualRecovery(
      `MANUAL_RECOVERY_REQUIRED ${definition.name}: created tool failed verification; automatic deletion is disabled.`,
    );
  }
  await assertPostWriteDependencyBoundary(provider, id, [], [], definition.name);
  return {
    tool,
    mutation,
    action: writeFailed ? 'reconciled' : 'created',
  };
}

export async function reconcileGovernedToolMutation({
  provider,
  manifest,
  definition,
  existing,
  reviewedBranchId,
  apply,
}) {
  const branchId = requireReviewedBranchId(reviewedBranchId);
  const desired = buildMemberAgentWebhookToolConfig(manifest, definition);
  return existing
    ? reconcileExistingTool(
        provider,
        desired,
        definition,
        existing,
        manifest.agentId,
        branchId,
        apply,
      )
    : reconcileMissingTool(provider, desired, definition, apply);
}

function assertAgentMatchesReviewedState(agent, agentPatch, allowedToolIds, requireExactToolIds) {
  const capabilityIssues = findMemberAgentCapabilityIssues(agent, allowedToolIds, {
    requireExactToolIds,
  });
  if (capabilityIssues.length > 0) {
    throw new ProviderReconciliationError(
      `Agent capability boundary failed: ${capabilityIssues.slice(0, 12).join(',')}`,
    );
  }
  const patchMismatches = findAgentPatchMismatches(agent, agentPatch);
  if (patchMismatches.length > 0) {
    throw new ProviderReconciliationError(
      `Agent reviewed patch drift: ${patchMismatches.slice(0, 12).join(',')}`,
    );
  }
}

export async function attachGovernedToolsWithReconciliation({
  provider,
  agentId,
  originalAgent,
  agentPatch,
  reviewedBranchId,
  desiredToolIds,
  apply,
}) {
  const branchId = requireReviewedBranchId(reviewedBranchId);
  assertReviewedAgentBranch(originalAgent, agentId, branchId);
  assertMemberAgentOwnership(originalAgent, agentId);
  const originalToolIds = originalAgent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const attached =
    originalToolIds.length === desiredToolIds.length &&
    desiredToolIds.every((id) => originalToolIds.includes(id));
  if (attached) {
    assertAgentMatchesReviewedState(originalAgent, agentPatch, desiredToolIds, true);
    return { agent: originalAgent, action: 'verified' };
  }
  if (!apply) throw new Error('Lilley is missing one or more governed member tools.');

  const preflight = await readWithBoundedRetries(() => provider.getAgent(agentId));
  assertReviewedAgentBranch(preflight, agentId, branchId);
  assertMemberAgentOwnership(preflight, agentId);
  if (!isDeepStrictEqual(preflight.conversation_config, originalAgent.conversation_config)) {
    throw new ProviderReconciliationError(
      'AGENT_CONCURRENT_DRIFT: conversation configuration changed before attachment.',
    );
  }
  assertAgentMatchesReviewedState(preflight, agentPatch, originalToolIds, false);

  let writeFailed = false;
  try {
    await provider.patchAgentToolIds(
      agentId,
      desiredToolIds,
      'Attach governed read-only WorkforceAP member tools',
    );
  } catch {
    writeFailed = true;
  }

  let verified;
  try {
    verified = await readWithBoundedRetries(() => provider.getAgent(agentId));
  } catch {
    throw manualRecovery(
      'MANUAL_RECOVERY_REQUIRED: agent attachment outcome is unreadable; provider state was preserved.',
    );
  }
  if (!verified) {
    throw manualRecovery(
      'MANUAL_RECOVERY_REQUIRED: agent is missing after tool attachment.',
    );
  }
  try {
    assertReviewedAgentBranch(verified, agentId, branchId);
    assertMemberAgentOwnership(verified, agentId);
  } catch {
    throw manualRecovery(
      'MANUAL_RECOVERY_REQUIRED: agent identity, branch, or ownership cannot be proven after attachment.',
    );
  }

  let desiredMutationIssues;
  try {
    desiredMutationIssues = findAgentToolAttachmentMutationIssues(
      preflight.conversation_config,
      verified.conversation_config,
      desiredToolIds,
    );
  } catch {
    throw manualRecovery(
      'MANUAL_RECOVERY_REQUIRED: concurrent or unexpected agent state after attachment.',
    );
  }
  if (desiredMutationIssues.length === 0) {
    try {
      assertAgentMatchesReviewedState(verified, agentPatch, desiredToolIds, true);
    } catch {
      throw manualRecovery(
        'MANUAL_RECOVERY_REQUIRED: concurrent or unexpected agent state after attachment.',
      );
    }
    return { agent: verified, action: writeFailed ? 'reconciled' : 'attached' };
  }

  if (isDeepStrictEqual(verified.conversation_config, preflight.conversation_config)) {
    try {
      assertAgentMatchesReviewedState(verified, agentPatch, originalToolIds, true);
    } catch {
      throw manualRecovery(
        'MANUAL_RECOVERY_REQUIRED: concurrent or unexpected agent state after attachment.',
      );
    }
    throw new ProviderReconciliationError(
      'ATTACH_AGENT_TOOLS did not apply; original preimage remains.',
    );
  }

  throw manualRecovery(
    `MANUAL_RECOVERY_REQUIRED: concurrent or unexpected agent state after attachment (${desiredMutationIssues.slice(0, 12).join(',')}).`,
  );
}

export async function runMemberAgentToolSync({
  provider,
  manifest,
  agentPatch,
  reviewedBranchId,
  apply,
  log = console.log,
}) {
  const branchId = requireReviewedBranchId(reviewedBranchId);
  const agent = await readWithBoundedRetries(() => provider.getAgent(manifest.agentId));
  assertReviewedAgentBranch(agent, manifest.agentId, branchId);
  assertMemberAgentOwnership(agent, manifest.agentId);
  const currentTools = await readWithBoundedRetries(() => provider.listTools());
  const indexed = indexGovernedTools(currentTools, manifest);
  const existingGovernedIds = [...indexed.values()]
    .filter(Boolean)
    .map((tool) => tool.id)
    .filter((id) => typeof id === 'string' && id);
  const existingToolIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const unknownToolIds = existingToolIds.filter((id) => !existingGovernedIds.includes(id));
  if (unknownToolIds.length > 0) {
    throw new Error(
      `Lilley has ${unknownToolIds.length} unreviewed tool id(s); refusing to mutate provider state.`,
    );
  }
  assertAgentMatchesReviewedState(agent, agentPatch, existingGovernedIds, false);
  for (const definition of manifest.tools) {
    const existing = indexed.get(definition.name);
    if (existing) assertGovernedToolOwnership(existing, definition.name);
  }

  const reconciled = [];
  const mutations = [];
  try {
    for (const definition of manifest.tools) {
      const result = await reconcileGovernedToolMutation({
        provider,
        manifest,
        definition,
        existing: indexed.get(definition.name),
        reviewedBranchId,
        apply,
      });
      reconciled.push(result.tool);
      if (result.mutation) mutations.push(result.mutation);
      log(`${result.action.toUpperCase()}_TOOL`, definition.name, result.tool.id);
    }
    const desiredToolIds = reconciled.map((tool) => requireProviderToolId(tool, 'governed-tool'));
    const attachment = await attachGovernedToolsWithReconciliation({
      provider,
      agentId: manifest.agentId,
      originalAgent: agent,
      agentPatch,
      reviewedBranchId: branchId,
      desiredToolIds,
      apply,
    });
    for (const tool of reconciled) {
      const toolId = requireProviderToolId(tool, 'governed-tool');
      await assertReviewedAttachmentDependency(
        provider,
        toolId,
        manifest.agentId,
        branchId,
        tool.tool_config?.name ?? toolId,
      );
    }
    log(`${attachment.action.toUpperCase()}_AGENT_TOOLS`, manifest.agentId, desiredToolIds.length);
    return { agent: attachment.agent, tools: reconciled };
  } catch (error) {
    if (error?.preserveToolState === true) throw error;
    if (mutations.length > 0) {
      await rollbackGovernedToolMutations(provider, mutations);
    }
    throw error;
  }
}

async function main() {
  const manifest = validateMemberAgentToolManifest(
    JSON.parse(await readFile(MANIFEST_PATH, 'utf8')),
  );
  const agentPatch = JSON.parse(
    await readFile(
      join(ROOT, 'scripts', 'elevenlabs', 'patches', `${manifest.agentId}.patch.json`),
      'utf8',
    ),
  );
  const requestedAgentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!requestedAgentId || requestedAgentId !== manifest.agentId) {
    throw new Error('Set ELEVENLABS_AGENT_ID to the reviewed Lilley agent explicitly.');
  }
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error('Set ELEVENLABS_API_KEY securely.');
  const reviewedBranchId = requireReviewedBranchId(
    process.env.ELEVENLABS_LILLEY_BRANCH_ID,
  );

  const apply = process.argv.includes('--apply');
  await runMemberAgentToolSync({
    provider: createProviderClient(key, reviewedBranchId),
    manifest,
    agentPatch,
    reviewedBranchId,
    apply,
  });
  console.log(apply ? 'APPLIED_AND_VERIFIED_MEMBER_TOOLS' : 'VERIFIED_MEMBER_TOOLS');
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Member tool sync failed.');
    process.exit(1);
  });
}
