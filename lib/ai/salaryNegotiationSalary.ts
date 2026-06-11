export function parsePrefillTargetSalary(targetSalary: string): number | undefined {
  const firstSalaryToken = targetSalary.match(/\d[\d,]*/)?.[0];
  if (!firstSalaryToken) return undefined;

  const parsed = parseInt(firstSalaryToken.replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
