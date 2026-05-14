/**
 * Shared marketing / public-site button class names.
 *
 * Compose: base + variant + radius (+ optional modifiers).
 * — primary: solid magenta (--color-accent)
 * — secondary: outline (add `onDarkSecondary` on photo/dark scrims)
 * — ghost: text-only
 *
 * Radius ladder matches `btn-radius-*` in css/main.css.
 */
export const marketingButton = {
  base: 'btn',
  variants: {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  },
  radius: {
    sm: 'btn-radius-sm',
    md: 'btn-radius-md',
    lg: 'btn-radius-lg',
    full: 'btn-radius-full',
  },
  onDarkSecondary: 'btn-secondary--on-dark',
  large: 'btn-large',
} as const;

export type MarketingButtonVariant = keyof typeof marketingButton.variants;
export type MarketingButtonRadius = keyof typeof marketingButton.radius;

export type MarketingButtonOptions = {
  variant: MarketingButtonVariant;
  /** Defaults to md */
  radius?: MarketingButtonRadius;
  large?: boolean;
  /** Outline / secondary on dark hero scrims */
  onDarkSecondary?: boolean;
  className?: string;
};

/** Whitespace-joined classes for anchors, buttons, and Link components. */
export function marketingButtonClasses({
  variant,
  radius = 'md',
  large = false,
  onDarkSecondary = false,
  className = '',
}: MarketingButtonOptions): string {
  const parts = [
    marketingButton.base,
    marketingButton.variants[variant],
    marketingButton.radius[radius],
    large ? marketingButton.large : '',
    variant === 'secondary' && onDarkSecondary ? marketingButton.onDarkSecondary : '',
    className,
  ];
  return parts.filter(Boolean).join(' ');
}
