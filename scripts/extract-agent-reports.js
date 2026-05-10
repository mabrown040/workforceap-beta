#!/usr/bin/env node
/**
 * Extract Cursor agent conversation reports from local SQLite store.
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const STORE_DIR = '/home/mike/.cursor/projects/home-mike-openclaw-dench-workspace-wap-repo/sdk-agent-store/971354f02268ecf6545923801d7eb4cd';

const AGENTS = [
  { id: 1, name: 'Member Voice', agentId: 'agent-bd61a66a-717b-4bb0-9ab0-5f7d5304cf23', runId: 'run-e5ea6494-d378-45d8-ac2d-b881d6db54cc' },
  { id: 2, name: 'Partner Voice', agentId: 'agent-1aa499ff-582f-457f-b338-2483261da5c2', runId: 'run-1524aa4a-439c-4ec0-979a-3d66aa8eb5fd' },
  { id: 3, name: 'Employer Voice', agentId: 'agent-75fb21c3-ee3c-4394-a3e5-795e1813f2f5', runId: 'run-7d4fc122-56ad-4682-88b2-c141eea8e5c2' },
  { id: 4, name: 'Global Voice', agentId: 'agent-142d7630-6af0-4fcd-b6cf-f7942fbfa45e', runId: 'run-3944ecc2-df3a-4739-8de9-4e0d0ef70f72' },
  { id: 5, name: 'CEO Visionary', agentId: 'agent-e8e3ab3d-9341-45f9-92e1-407a988ce577', runId: 'run-d6af459b-a16f-427e-ae5b-f94ae27df0db' },
];

async function getMessages(dbPath, runId) {
  try {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    
    // Try to get messages from the runs table
    const messages = await db.all(
      `SELECT role, content, created_at FROM messages 
       WHERE run_id = ? 
       ORDER BY created_at ASC`,
      [runId]
    );
    
    await db.close();
    return messages;
  } catch (e) {
    return [];
  }
}

async function getAgentStore(agentId) {
  const storePath = path.join(STORE_DIR, 'agents', agentId, 'store.db');
  return getMessages(storePath);
}

async function printReport(agentInfo) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`AGENT ${agentInfo.id}: ${agentInfo.name}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const messages = await getAgentStore(agentInfo.agentId, agentInfo.runId);
  
  if (messages.length === 0) {
    console.log('(No messages found in local store. Agent may have run in cloud mode.)');
    return;
  }
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      console.log(`USER: ${msg.content?.substring(0, 200)}...\n`);
    } else if (msg.role === 'assistant') {
      console.log(`AGENT: ${msg.content}\n`);
    }
  }
}

async function main() {
  for (const agent of AGENTS) {
    await printReport(agent);
  }
}

main().catch(console.error);
