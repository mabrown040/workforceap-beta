/**
 * Root-layout identity for GUC / Sentry / provision.
 *
 * Middleware is the only writer of `x-wap-user-id` (it strips any
 * client-supplied value first). Layout must not fall back to
 * `getUser()` when the header is absent — that is the anonymous
 * HTML auth tax (`clm_hot_layout_auth_every_request`).
 *
 * When the header is present, layout may still call `getUser()` to
 * provision the app user (request-cached; portal / cookie-bearing
 * public pages only).
 */
export const WAP_USER_ID_HEADER = 'x-wap-user-id';

export function resolveLayoutUserId(forwardedUserId: string | null | undefined): string | null {
  if (typeof forwardedUserId !== 'string') return null;
  const id = forwardedUserId.trim();
  return id.length > 0 ? id : null;
}
