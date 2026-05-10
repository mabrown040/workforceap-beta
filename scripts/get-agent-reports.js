const { Agent } = require('@cursor/sdk');

const API_KEY = process.env.CURSOR_API_KEY;

const AGENTS = [
  { id: 1, name: 'Member Voice', agentId: 'agent-bd61a66a-717b-4bb0-9ab0-5f7d5304cf23', runId: 'run-e5ea6494-d378-45d8-ac2d-b881d6db54cc' },
  { id: 2, name: 'Partner Voice', agentId: 'agent-1aa499ff-582f-457f-b338-2483261da5c2', runId: 'run-1524aa4a-439c-4ec0-979a-3d66aa8eb5fd' },
  { id: 3, name: 'Employer Voice', agentId: 'agent-75fb21c3-ee3c-4394-a3e5-795e1813f2f5', runId: 'run-7d4fc122-56ad-4682-88b2-c141eea8e5c2' },
  { id: 4, name: 'Global Voice', agentId: 'agent-142d7630-6af0-4fcd-b6cf-f7942fbfa45e', runId: 'run-3944ecc2-df3a-4739-8de9-4e0d0ef70f72' },
  { id: 5, name: 'CEO Visionary', agentId: 'agent-e8e3ab3d-9341-45f9-92e1-407a988ce577', runId: 'run-d6af459b-a16f-427e-ae5b-f94ae27df0db' },
];

async function getAgentReport(agentInfo) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Agent ${agentInfo.id}] ${agentInfo.name}`);
  console.log('='.repeat(60));

  try {
    const agent = await Agent.get(agentInfo.agentId, { runtime: 'local' });
    console.log('Agent retrieved:', agent.agentId || agent.id);
    
    // Try to get messages through the agent instance
    try {
      const messages = await agent.messages(agentInfo.runId);
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          if (msg.role === 'assistant' && msg.content) {
            console.log(msg.content);
          }
        }
      } else {
        console.log('(No conversation output available)');
      }
    } catch (e) {
      console.log('Could not fetch conversation via agent:', e.message);
    }

    // Try run.wait() to get result
    try {
      const run = await Agent.getRun(agentInfo.runId, { runtime: 'local', agentId: agentInfo.agentId });
      console.log('Run status:', run.currentStatus);
      
      // Check if run has result
      if (run._result) {
        console.log('Result:', JSON.stringify(run._result, null, 2));
      }
      
      // Check git info
      if (run.git) {
        console.log('Branch:', run.git.branch || 'none');
        console.log('PR:', run.git.prUrl || 'none');
      }
    } catch (e) {
      console.log('Could not get run details:', e.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  if (!API_KEY) {
    console.error('CURSOR_API_KEY not set');
    process.exit(1);
  }

  for (const agent of AGENTS) {
    await getAgentReport(agent);
  }
}

main().catch(console.error);
