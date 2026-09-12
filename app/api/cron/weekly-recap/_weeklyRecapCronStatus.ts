export function getWeeklyRecapCronStatus(failed: number, skipped = 0): 'ok' | 'error' {
  return failed > 0 || skipped > 0 ? 'error' : 'ok';
}
