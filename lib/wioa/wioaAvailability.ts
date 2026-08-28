/**
 * The inside-portal WIOA assessment is available by default.
 *
 * Keep an explicit `NEXT_PUBLIC_WIOA_ENABLED=0` as a navigation/discovery
 * switch; the direct page and APIs intentionally remain reachable.
 */
export function isWioaPortalAvailable(
  flag: string | undefined
): boolean {
  return flag !== '0';
}
