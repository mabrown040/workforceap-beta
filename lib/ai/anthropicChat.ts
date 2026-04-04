import Anthropic from '@anthropic-ai/sdk';

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export function isAnthropicConfigured(): boolean {
  return !!client;
}

export async function claudeChat(
  systemPrompt: string,
  userContent: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  if (!client) return null;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: opts?.maxTokens ?? 2000,
    temperature: opts?.temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const block = msg.content[0];
  return block?.type === 'text' ? block.text : null;
}
