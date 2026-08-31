import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import {
  ELEVENLABS_LILLEY_BRANCH_ENV,
  requireElevenLabsBranchId,
} from '@/lib/ai/elevenlabs';
import {
  ELEVENLABS_AGENT_REGISTRY,
  type ElevenLabsAgentKey,
} from '@/lib/elevenlabs/agentRegistry';
import {
  AGENT_GATEWAY_SECRET_VARIABLE,
  issueAgentGatewaySession,
} from './sessionStore';
import type { AuthenticatedAgentPrincipal } from './types';

/**
 * Start a private member agent and bind its read tools to a short-lived,
 * opaque, server-stored principal. The browser receives only the self-scoped
 * token as an ElevenLabs secret dynamic variable; user/org IDs never enter the
 * model tool schema.
 */
export async function startMemberAgentGatewaySession(input: {
  userId: string;
  organizationId: string;
  role: AuthenticatedAgentPrincipal['role'];
  agentKey: ElevenLabsAgentKey;
}): Promise<{
  signedUrl: string;
  expiresAt?: string;
  conversationId?: string;
  dynamicVariables: Record<string, string>;
}> {
  const registryEntry = ELEVENLABS_AGENT_REGISTRY[input.agentKey];
  if (
    registryEntry.exposure !== 'private' ||
    !(registryEntry.audiences as readonly string[]).includes('member') ||
    registryEntry.allowedMemberTools.length === 0
  ) {
    throw new Error(`Agent "${input.agentKey}" is not approved for member data tools.`);
  }

  // The signed URL is controlled by the member's browser. Never put text
  // dynamic variables into a member agent system prompt: a member can replace
  // them in Conversation.startSession. Account and program truth comes only
  // from tenant-scoped read tools.
  const branchId = requireElevenLabsBranchId(
    process.env[ELEVENLABS_LILLEY_BRANCH_ENV],
  );
  const providerSession = await startElevenLabsPortalSession(input.agentKey, {
    branchId,
  });
  const gatewaySession = await issueAgentGatewaySession({
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.role,
    agentKey: input.agentKey,
    ...(providerSession.conversationId
      ? { conversationId: providerSession.conversationId }
      : {}),
    allowedTools: [...registryEntry.allowedMemberTools],
  });

  // ElevenLabs resolves secret dynamic header variables as the entire header
  // value. The token is the only browser-visible variable and is not inserted
  // into the model prompt.
  const dynamicVariables = {
    [AGENT_GATEWAY_SECRET_VARIABLE]: `Bearer ${gatewaySession.token}`,
  };

  return {
    signedUrl: providerSession.signedUrl,
    ...(providerSession.expiresAt ? { expiresAt: providerSession.expiresAt } : {}),
    ...(providerSession.conversationId
      ? { conversationId: providerSession.conversationId }
      : {}),
    dynamicVariables,
  };
}
