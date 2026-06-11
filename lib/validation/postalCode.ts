/**
 * Postal code validation shared by signup, apply, and profile forms.
 *
 * Accepts US ZIP codes (78701, 78701-1234) and international postal codes
 * such as 100001 (Lagos), SW1A 1AA (London), or K1A 0B1 (Ottawa):
 * 3–10 characters of letters, digits, spaces, or hyphens, starting with a
 * letter or digit.
 */
export const POSTAL_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/;

export function isValidPostalCode(value: string): boolean {
  return POSTAL_CODE_REGEX.test(value.trim());
}
