/**
 * ElevenLabs integrations for WorkforceAP AI interview tools.
 *
 * Supports:
 * - Text-to-speech (existing)
 * - Conversational AI signed URL session creation
 * - Post-interview feedback generation with Anthropic fallback support
 */

import { claudeChat } from './anthropicChat';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_SIGNED_URL_TIMEOUT_MS = 8_000;
const ELEVENLABS_PROVIDER_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export const ELEVENLABS_LILLEY_BRANCH_ENV = 'ELEVENLABS_LILLEY_BRANCH_ID' as const;

export function requireElevenLabsBranchId(
  value: string | undefined,
  environmentKey: string = ELEVENLABS_LILLEY_BRANCH_ENV,
): string {
  const branchId = value?.trim();
  if (!branchId) {
    throw new Error(`${environmentKey} is not set`);
  }
  if (!ELEVENLABS_PROVIDER_IDENTIFIER.test(branchId)) {
    throw new Error(`${environmentKey} is invalid`);
  }
  return branchId;
}

// Professional female voice — good for interviewer persona
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

interface ElevenLabsOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export type InterviewType = 'technical' | 'behavioral' | 'general';

export interface TranscriptTurn {
  speaker: 'candidate' | 'interviewer';
  text: string;
  at?: string;
}

export interface FeedbackResult {
  summary: string;
  strengths: string[];
  improvements: string[];
  overallScore: number;
  source: 'anthropic' | 'heuristic';
}

/**
 * Generate speech audio from text using ElevenLabs API.
 * Returns an ArrayBuffer of MP3 audio data.
 */
export async function generateSpeech(
  text: string,
  options: ElevenLabsOptions = {}
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = 'eleven_monolingual_v1',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  return response.arrayBuffer();
}

/**
 * List available voices from ElevenLabs.
 */
export async function listVoices(): Promise<
  { voice_id: string; name: string; category: string }[]
> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    voices: { voice_id: string; name: string; category: string }[];
  };
  return data.voices;
}

/**
 * Create a signed conversational session URL for ElevenLabs Conversational AI.
 * Dynamic prompt/context must be sent from the client via `Conversation.startSession({ overrides })`
 * (see `@elevenlabs/client`); appending overrides to the signed URL is not reliably applied.
 */
export async function createConversationalSession(
  agentId: string,
  options: { branchId?: string } = {},
): Promise<{
  signedUrl: string;
  expiresAt?: string;
  conversationId?: string;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const query = new URLSearchParams({
    agent_id: agentId,
    include_conversation_id: 'true',
  });
  if (options.branchId !== undefined) {
    query.set(
      'branch_id',
      requireElevenLabsBranchId(options.branchId, 'ElevenLabs branch ID'),
    );
  }
  const url = `${ELEVENLABS_API_URL}/convai/conversation/get-signed-url?${query.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
    signal: AbortSignal.timeout(ELEVENLABS_SIGNED_URL_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Provider response bodies are intentionally not surfaced or logged. They
    // are not needed by callers and can contain workspace diagnostics.
    throw new Error(`ElevenLabs Conversational API error (${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const signedUrl =
    (typeof data.signed_url === 'string' ? data.signed_url : undefined) ??
    (typeof data.signedUrl === 'string' ? data.signedUrl : undefined);
  if (!signedUrl) {
    throw new Error('ElevenLabs did not return a signed conversation URL');
  }

  const conversationId =
    (typeof data.conversation_id === 'string' ? data.conversation_id : undefined) ??
    (typeof data.conversationId === 'string' ? data.conversationId : undefined);

  const unix =
    typeof data.expires_at_unix_secs === 'number'
      ? data.expires_at_unix_secs
      : typeof data.expires_at_unix_secs === 'string'
        ? Number(data.expires_at_unix_secs)
        : NaN;

  return {
    signedUrl,
    expiresAt: Number.isFinite(unix) ? new Date(unix * 1000).toISOString() : undefined,
    ...(conversationId ? { conversationId } : {}),
  };
}

export async function generateInterviewFeedback(params: {
  role: string;
  interviewType: InterviewType;
  transcript: TranscriptTurn[];
}): Promise<FeedbackResult> {
  const { role, interviewType, transcript } = params;

  const candidateTurns = transcript
    .filter((turn) => turn.speaker === 'candidate')
    .map((turn) => turn.text.trim())
    .filter(Boolean);

  if (candidateTurns.length === 0) {
    return {
      summary: 'No candidate responses were captured. Try running another interview and ensure microphone access is enabled.',
      strengths: ['Session initialized successfully'],
      improvements: ['Provide spoken answers so feedback can be generated'],
      overallScore: 20,
      source: 'heuristic',
    };
  }

  const systemPrompt =
    'You are an interview coach. Return concise feedback as strict JSON with keys: summary(string), strengths(string[] exactly 3), improvements(string[] exactly 3), overallScore(number 0-100).';
  const userPrompt = [
    `Role: ${role}`,
    `Interview type: ${interviewType}`,
    'Candidate transcript:',
    ...candidateTurns.map((turn, i) => `${i + 1}. ${turn}`),
  ].join('\n');

  const text = await claudeChat(systemPrompt, userPrompt, { maxTokens: 900, temperature: 0.3 });
  if (text) {
    try {
      const parsed = JSON.parse(text) as {
        summary: string;
        strengths: string[];
        improvements: string[];
        overallScore: number;
      };
      if (
        typeof parsed.summary === 'string' &&
        Array.isArray(parsed.strengths) &&
        Array.isArray(parsed.improvements) &&
        typeof parsed.overallScore === 'number'
      ) {
        return {
          summary: parsed.summary,
          strengths: parsed.strengths.slice(0, 3),
          improvements: parsed.improvements.slice(0, 3),
          overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
          source: 'anthropic',
        };
      }
    } catch {
      // Fall through to heuristic feedback.
    }
  }

  const totalWords = candidateTurns
    .join(' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean).length;

  const avgWords = Math.round(totalWords / Math.max(candidateTurns.length, 1));
  const usedOutcomeLanguage = candidateTurns.some((line) =>
    /(result|impact|improved|reduced|increased|delivered|launched)/i.test(line)
  );
  const usedStructureLanguage = candidateTurns.some((line) =>
    /(first|then|next|finally|because|therefore|so that)/i.test(line)
  );

  let score = 45;
  if (avgWords >= 35) score += 20;
  else if (avgWords >= 20) score += 12;
  else score += 5;
  if (usedOutcomeLanguage) score += 18;
  if (usedStructureLanguage) score += 12;

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    summary:
      finalScore >= 75
        ? 'Strong interview fundamentals. Your answers were detailed and included outcome-oriented language.'
        : 'You have a solid start. Focus on giving more structured responses with specific outcomes and measurable impact.',
    strengths: [
      'You stayed engaged throughout the interview session.',
      avgWords >= 20 ? 'You provided meaningful detail in responses.' : 'You answered each prompt directly.',
      usedOutcomeLanguage
        ? 'You referenced impact/results, which hiring managers value.'
        : 'You maintained role relevance in your answers.',
    ],
    improvements: [
      'Use STAR-style framing (Situation, Task, Action, Result) for key stories.',
      'Add metrics or business outcomes where possible (%, $, time saved).',
      interviewType === 'technical'
        ? 'Explain your decision-making process before jumping to final solutions.'
        : 'Practice concise opening statements before expanding into detail.',
    ],
    overallScore: finalScore,
    source: 'heuristic',
  };
}
