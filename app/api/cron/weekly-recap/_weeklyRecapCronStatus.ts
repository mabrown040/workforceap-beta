export function getWeeklyRecapCronStatus(failed: number): 'ok' | 'error' {
  return failed > 0 ? 'error' : 'ok';
}
