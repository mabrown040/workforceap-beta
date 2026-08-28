/**
 * The inside-portal WIOA assessment is available by default.
 *
 * Keep an explicit `NEXT_PUBLIC_WIOA_ENABLED=0` as the emergency kill switch;
 * missing or newly provisioned environments should not silently hide the link.
 */
export function isWioaPortalAvailable(
  flag: string | undefined
): boolean {
  return flag !== '0';
}
