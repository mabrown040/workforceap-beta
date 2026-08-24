/**
 * Staff MFA gate for admin/counselor routes.
 *
 * Staged rollout in non-production: off unless `STAFF_MFA_ENFORCEMENT=1`.
 * Production (`VERCEL_ENV=production`) fails closed: on unless the flag is
 * an explicit disable (`0` / `false` / `off`). Missing or unknown values
 * enforce MFA so a forgotten env var cannot ship an open staff portal.
 */
export function isStaffMfaEnforcementEnabled(): boolean {
  const raw = process.env.STAFF_MFA_ENFORCEMENT;
  if (process.env.VERCEL_ENV === 'production') {
    const v = raw?.trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off';
  }
  return raw === '1';
}
