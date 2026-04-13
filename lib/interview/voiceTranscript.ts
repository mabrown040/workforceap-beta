export type VoiceTranscriptTurn = {
  role: 'agent' | 'user';
  text: string;
};

type ElevenLabsMessageLike = {
  role?: unknown;
  message?: unknown;
  type?: unknown;
  user_transcription_event?: { user_transcript?: unknown };
  agent_response_event?: { agent_response?: unknown };
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

export function extractVoiceTranscriptTurn(event: unknown): VoiceTranscriptTurn | null {
  if (!event || typeof event !== 'object') return null;

  const payload = event as ElevenLabsMessageLike;
  const normalizedMessage = normalizeText(payload.message);
  if ((payload.role === 'agent' || payload.role === 'user') && normalizedMessage) {
    return { role: payload.role, text: normalizedMessage };
  }

  if (payload.type === 'user_transcript') {
    const userTranscript = normalizeText(payload.user_transcription_event?.user_transcript);
    return userTranscript ? { role: 'user', text: userTranscript } : null;
  }

  if (payload.type === 'agent_response') {
    const agentResponse = normalizeText(payload.agent_response_event?.agent_response);
    return agentResponse ? { role: 'agent', text: agentResponse } : null;
  }

  return null;
}

export function appendVoiceTranscriptTurn(
  turns: VoiceTranscriptTurn[],
  turn: VoiceTranscriptTurn | null
): VoiceTranscriptTurn[] {
  if (!turn) return turns;
  const normalizedText = normalizeText(turn.text);
  if (!normalizedText) return turns;
  const normalizedTurn: VoiceTranscriptTurn = { role: turn.role, text: normalizedText };
  const lastTurn = turns[turns.length - 1];
  if (lastTurn && lastTurn.role === normalizedTurn.role && lastTurn.text === normalizedTurn.text) {
    return turns;
  }
  return [...turns, normalizedTurn];
}

export function buildInterviewQaFromVoiceTurns(turns: VoiceTranscriptTurn[]): {
  questions: string[];
  answers: string[];
} {
  const questions: string[] = [];
  const answers: string[] = [];
  let currentQuestion = '';

  for (const turn of turns) {
    if (turn.role === 'agent') {
      currentQuestion = turn.text;
      continue;
    }

    const answer = normalizeText(turn.text);
    if (!answer) continue;
    questions.push(currentQuestion || 'Voice question');
    answers.push(answer);
  }

  return { questions, answers };
}
