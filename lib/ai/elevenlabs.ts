/**
 * ElevenLabs Text-to-Speech integration for Interview Simulator.
 *
 * Uses the ElevenLabs API to generate realistic AI interviewer voice.
 * API key stored in ELEVENLABS_API_KEY env var (never committed to code).
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Professional female voice — good for interviewer persona
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

interface ElevenLabsOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
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

  const data = await response.json();
  return data.voices;
}
