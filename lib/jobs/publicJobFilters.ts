/**
 * Hide obvious sandbox / demo employers from the public job board in production.
 */
export function isExcludedPublicEmployerName(companyName: string | null | undefined): boolean {
  const n = companyName?.trim().toLowerCase() ?? '';
  if (!n) return false;
  return n === 'test' || n === 'test students' || n.startsWith('test ');
}
