import { MEMBER_AGENT_TOOL_NAMES, type MemberAgentToolName } from './types';

export type MemberAgentToolDefinition = Readonly<{
  name: MemberAgentToolName;
  description: string;
  inputSchema: Readonly<{
    type: 'object';
    properties: Readonly<Record<string, never>>;
    additionalProperties: false;
  }>;
}>;

const DESCRIPTIONS: Record<MemberAgentToolName, string> = {
  get_my_next_step:
    "Read the signed-in member's highest-priority WorkforceAP next step. Takes no arguments.",
  get_training_status:
    "Read the signed-in member's assigned program and validated training progress, including whether the governed approved catalog exactly applies to that enrollment version. Takes no arguments.",
  get_coursera_progress:
    "Read the signed-in member's latest Coursera progress synchronized into WorkforceAP. Takes no arguments.",
};

/**
 * Empty schemas are intentional. Identity and tenant scope come exclusively
 * from the authenticated server principal closed over by the gateway.
 */
export const MEMBER_AGENT_TOOL_DEFINITIONS: readonly MemberAgentToolDefinition[] =
  MEMBER_AGENT_TOOL_NAMES.map((name) => ({
    name,
    description: DESCRIPTIONS[name],
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  }));
