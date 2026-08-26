import { NextResponse } from 'next/server';
import { isAIConfigured } from '@/lib/ai/groq';
import { AI_UNCONFIGURED_CODE, AI_UNCONFIGURED_MESSAGE } from '@/lib/ai/configured';

export function aiUnconfiguredResponse() {
  return NextResponse.json(
    { error: AI_UNCONFIGURED_MESSAGE, code: AI_UNCONFIGURED_CODE },
    { status: 503 },
  );
}

/** Return a 503 response when no LLM provider is configured; otherwise null. */
export function ifAiUnconfigured(): ReturnType<typeof aiUnconfiguredResponse> | null {
  return isAIConfigured() ? null : aiUnconfiguredResponse();
}
