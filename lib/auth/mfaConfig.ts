export function isStaffMfaEnforcementEnabled() {
  return process.env.STAFF_MFA_ENFORCEMENT === '1';
}
