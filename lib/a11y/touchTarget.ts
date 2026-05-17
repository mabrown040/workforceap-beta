/**
 * Mobile-first accessibility: enforce minimum 44×44dp touch targets
 * across all interactive elements in the portal.
 *
 * Applied via a single class or global rule on portal surfaces.
 * 44×44 CSS pixels ≈ 48×48 for most devices (devicePixelRatio 1-2).
 */
export const MIN_TOUCH_TARGET_CSS = '2.75rem'; // 44px at 16px base

export function touchTargetStyle(): React.CSSProperties {
  return {
    minWidth: MIN_TOUCH_TARGET_CSS,
    minHeight: MIN_TOUCH_TARGET_CSS,
  };
}
