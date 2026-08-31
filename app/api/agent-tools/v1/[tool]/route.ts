import { NextResponse } from 'next/server';

import { createMemberAgentGatewayForPrincipal } from '@/lib/agents/gateway/server';
import {
  MEMBER_AGENT_TOOL_NAMES,
  type MemberAgentToolName,
} from '@/lib/agents/gateway/types';
import {
  AgentGatewaySessionError,
  authorizeAgentGatewaySession,
  readBearerToken,
} from '@/lib/agents/gateway/sessionStore';
import { ELEVENLABS_AGENT_REGISTRY } from '@/lib/elevenlabs/agentRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ tool: string }> };

const TOOL_NAMES = new Set<string>(MEMBER_AGENT_TOOL_NAMES);
const MAX_REQUEST_BODY_BYTES = 4 * 1024;
const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}

async function hasEmptyObjectBody(request: Request): Promise<boolean> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return false;
  }

  if (!request.body) return true;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      return false;
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  if (!raw.trim()) return true;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Boolean(
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed as Record<string, unknown>).length === 0,
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { tool: rawTool } = await context.params;
  if (!TOOL_NAMES.has(rawTool)) {
    return json({ error: 'Unknown agent tool.' }, 404);
  }
  const tool = rawTool as MemberAgentToolName;

  // These tools take no arguments by design. In particular, model-supplied
  // userId or organizationId fields are rejected before any data read.
  if (!(await hasEmptyObjectBody(request))) {
    return json({ error: 'This read-only tool does not accept arguments.' }, 400);
  }

  const token = readBearerToken(request);
  if (!token) return json({ error: 'Unauthorized.' }, 401);

  try {
    const claims = await authorizeAgentGatewaySession(token, tool);
    const agentKey = claims.agentKey as keyof typeof ELEVENLABS_AGENT_REGISTRY;
    const registryEntry = ELEVENLABS_AGENT_REGISTRY[agentKey];
    if (
      !registryEntry ||
      !(registryEntry.allowedMemberTools as readonly string[]).includes(tool)
    ) {
      return json({ error: 'This agent is not approved to use that tool.' }, 403);
    }

    const gateway = await createMemberAgentGatewayForPrincipal({
      userId: claims.userId,
      organizationId: claims.organizationId,
      role: claims.role,
    });
    if (!gateway) {
      return json({ error: 'The member session is no longer active.' }, 403);
    }

    return json(await gateway.invoke({ tool }));
  } catch (error) {
    if (error instanceof AgentGatewaySessionError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error('[agent-gateway] read-only tool invocation failed', {
      tool,
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    return json({ error: 'Agent tools are temporarily unavailable.' }, 503);
  }
}
