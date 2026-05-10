const { Agent } = require('@cursor/sdk');

const API_KEY = process.env.CURSOR_API_KEY;

const AGENT_IDS = [
  { id: 1, name: 'Member Voice', agentId: 'agent-bd61a66a-717b-4bb0-9ab0-5f7d5304cf23', runId: 'run-e5ea6494-d378-45d8-ac2d-b881d6db54cc' },
  { id: 2, name: 'Partner Voice', agentId: 'agent-1aa499ff-582f-457f-b338-2483261da5c2', runId: 'run-1524aa4a-439c-4ec0-979a-3d66aa8eb5fd' },
  { id: 3, name: 'Employer Voice', agentId: 'agent-75fb21c3-ee3c-4394-a3e5-795e1813f2f5', runId: 'run-7d4fc122-56ad-4682-88b2-c141eea8e5c2' },
  { id: 4, name: 'Global Voice', agentId: 'agent-142d7630-6af0-4fcd-b6cf-f7942fbfa45e', runId: 'run-3944ecc2-df3a-4739-8de9-4e0d0ef70f72' },
  { id: 5, name: 'CEO Visionary', agentId: 'agent-e8e3ab3d-9341-45f9-92e1-407a988ce577', runId: 'run-d6af459b-a16f-427e-ae5b-f94ae27df0db' },
  { id: 6, name: 'Build Stability', agentId: 'agent-c488e5e0-c6e8-4ea7-9f84-31bcb60598c9', runId: 'run-e630db54-2deb-4307-9ee6-6d32a85bced5' },
  { id: 7, name: 'xAPI Persistence', agentId: 'agent-be6b7696-49e7-4ea6-b4dc-dc44d26ae316', runId: 'run-c5683837-d3dd-4e74-a763-64dc350376f9' },
  { id: 8, name: 'b4b API Sync', agentId: 'agent-0e5472cd-d0a5-4db3-9aa7-6889878b32bc', runId: 'run-8f604f5f-3b98-4a68-bbaa-27d83fd5bc1c' },
  { id: 9, name: 'Program Mapping', agentId: 'agent-249c6873-aceb-408f-80c2-afb8ea3d4065', runId: 'run-2a08559a-b50b-437f-bd42-1b657f0ae774' },
  { id: 10, name: 'Super Admin Sync', agentId: 'agent-446ce673-a3da-41e4-88bb-306fadfaf398', runId: 'run-aa731e4b-b968-4c65-98b2-c38273796acc' },
];

async function checkStatus(agentInfo) {
  try {
    const run = await Agent.getRun(agentInfo.runId, { runtime: 'local', agentId: agentInfo.agentId });
    console.log(`[Agent ${agentInfo.id}] ${agentInfo.name}: ${run.currentStatus || 'unknown'}`);
  } catch (error) {
    console.error(`[Agent ${agentInfo.id}] Error:`, error.message);
  }
}

async function main() {
  for (const agent of AGENT_IDS) {
    await checkStatus(agent);
  }
}

main().catch(console.error);
