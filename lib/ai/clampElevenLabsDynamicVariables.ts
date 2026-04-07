/**
 * ElevenLabs ConvAI dynamic variables must be strings with bounded size.
 * Oversized program_skill lists or unusual DB values can break the JS SDK or agent handshake.
 */
const MAX_KEY_LEN = 120;
const MAX_VALUE_LEN = 4000;

export function clampElevenLabsDynamicVariables(
  vars: Record<string, string | number | boolean>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (!k) continue;
    const key = k.length > MAX_KEY_LEN ? k.slice(0, MAX_KEY_LEN) : k;
    const s = (typeof v === 'string' ? v : String(v ?? '')).replace(/\0/g, '').slice(0, MAX_VALUE_LEN);
    out[key] = s;
  }
  return out;
}
