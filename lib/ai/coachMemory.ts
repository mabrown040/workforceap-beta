/**
 * @deprecated Import from `@/lib/coach/memory` — re-exported for backward compatibility.
 */
export {
  appendCoachMemoryToSystemPrompt,
  formatCoachTranscript,
  getCoachMemoryDynamicVariables,
  loadCoachMemory,
  takeLastCoachExchanges,
  updateCoachMemory,
  type CoachTurn,
} from '@/lib/coach/memory';

export type CoachTranscriptTurn = import('@/lib/coach/memory').CoachTurn;

import { loadCoachMemory as loadCoachMemoryImpl, updateCoachMemory as updateCoachMemoryImpl } from '@/lib/coach/memory';

/** @deprecated Use `loadCoachMemory` */
export async function getCoachMemorySummary(userId: string): Promise<string | null> {
  return loadCoachMemoryImpl(userId);
}

/** @deprecated Use `updateCoachMemory` */
export async function updateCoachMemoryFromTranscript(
  userId: string,
  transcript: import('@/lib/coach/memory').CoachTurn[]
): Promise<void> {
  return updateCoachMemoryImpl({ userId, recentTurns: transcript });
}
