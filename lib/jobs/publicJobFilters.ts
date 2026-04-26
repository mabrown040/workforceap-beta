/**
 * Hide obvious sandbox / demo employers from the public job board in production.
 */
export function isExcludedPublicEmployerName(companyName: string | null | undefined): boolean {
  const n = companyName?.trim().toLowerCase() ?? '';
  if (!n) return false;
  return (
    n === 'test' ||
    n === 'test students' ||
    n === 'capital area employer network' ||
    n === 'qa employer co' ||
    n.startsWith('test ') ||
    n.startsWith('qa ')
  );
}

/**
 * Hide jobs whose title is tagged as a QA / test fixture regardless of employer.
 * Catches stragglers like `[QA] Software Engineer` under an otherwise real employer.
 */
export function isExcludedPublicJobTitle(title: string | null | undefined): boolean {
  const t = title?.trim().toLowerCase() ?? '';
  if (!t) return false;
  return t.startsWith('[qa]') || t.startsWith('[test]');
}
