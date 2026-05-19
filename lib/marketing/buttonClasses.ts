/**
 * Shared marketing / public-site button class names.
 *
 * Compose: base + variant + radius (+ optional modifiers).
 * All interactive `.btn` controls use `--btn-min-height` (44px) in css/main.css.
 *
 * Variants (`MARKETING_BUTTON_VARIANT_CLASS`):
 * — primary: solid magenta (--color-accent)
 * — secondary: outline (`onDarkSecondary` on photo/dark scrims)
 * — ghost: text-only (`onDarkGhost` on photo / dark scrims for light foreground)
 *
 * Radius ladder (`MARKETING_BUTTON_RADIUS_CLASS`): sm / md / lg / full → `btn-radius-*` in css/main.css.
 */
export const MARKETING_BUTTON_VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
} as const;

export const MARKETING_BUTTON_RADIUS_CLASS = {
  sm: 'btn-radius-sm',
  md: 'btn-radius-md',
  lg: 'btn-radius-lg',
  full: 'btn-radius-full',
} as const;

export const marketingButton = {
  base: 'btn',
  variants: MARKETING_BUTTON_VARIANT_CLASS,
  radius: MARKETING_BUTTON_RADIUS_CLASS,
  /** 44×44 circular primary index — pair with `variant: primary` + `radius: full` */
  modifiers: {
    numPill: 'marketing-btn-num-pill',
  },
  onDarkSecondary: 'btn-secondary--on-dark',
  onDarkGhost: 'btn-ghost--on-photo',
  large: 'btn-large',
  fullWidth: 'btn-full-width',
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
  /** Ghost on photo / dark scrims — light text (not magenta default) */
  onDarkGhost?: boolean;
  className?: string;
};

/** Whitespace-joined classes for anchors, buttons, and Link components. */
export function marketingButtonClasses({
  variant,
  radius = 'md',
  large = false,
  onDarkSecondary = false,
  onDarkGhost = false,
  className = '',
}: MarketingButtonOptions): string {
  const parts = [
    marketingButton.base,
    marketingButton.variants[variant],
    marketingButton.radius[radius],
    large ? marketingButton.large : '',
    variant === 'secondary' && onDarkSecondary ? marketingButton.onDarkSecondary : '',
    variant === 'ghost' && onDarkGhost ? marketingButton.onDarkGhost : '',
    className,
  ];
  return parts.filter(Boolean).join(' ');
}

/** Solid primary (magenta fill) — header CTAs, form submit, prominent actions. */
export function marketingPrimaryButtonClasses(
  options: Omit<MarketingButtonOptions, 'variant'> = {}
): string {
  return marketingButtonClasses({ variant: 'primary', ...options });
}

/** Outline secondary — pair with `onDarkSecondary` on hero scrims. */
export function marketingSecondaryButtonClasses(
  options: Omit<MarketingButtonOptions, 'variant'> = {}
): string {
  return marketingButtonClasses({ variant: 'secondary', ...options });
}

/** Text-only ghost — no border or fill. */
export function marketingGhostButtonClasses(
  options: Omit<MarketingButtonOptions, 'variant'> = {}
): string {
  return marketingButtonClasses({ variant: 'ghost', ...options });
}

/** Numbered pills / step index: solid magenta circle, full radius, 44px min. */
export function marketingNumPillClasses(options?: { className?: string }): string {
  return marketingButtonClasses({
    variant: 'primary',
    radius: 'full',
    className: [marketingButton.modifiers.numPill, options?.className].filter(Boolean).join(' '),
  });
}

/**
 * Shared compositions for header / hero / forms / step indices.
 * All use `.btn` (min-height 44px), variant colors, and `btn-radius-*` ladder.
 */
export const marketingButtonPresets = {
  /** Header “Apply Now” and equivalent nav CTAs */
  navApplyCta: (className = '') =>
    marketingPrimaryButtonClasses({
      radius: 'md',
      className: ['nav-cta', className].filter(Boolean).join(' '),
    }),

  heroPrimary: (className = '') =>
    marketingButtonClasses({
      variant: 'primary',
      radius: 'lg',
      large: true,
      className,
    }),

  heroSecondaryOnDark: (className = '') =>
    marketingButtonClasses({
      variant: 'secondary',
      radius: 'lg',
      large: true,
      onDarkSecondary: true,
      className,
    }),

  heroGhostOnDark: (className = '') =>
    marketingButtonClasses({
      variant: 'ghost',
      radius: 'md',
      large: true,
      onDarkGhost: true,
      className,
    }),

  /** Numbered hero step row — outline capsule on photo scrim */
  heroStepCapsuleOnDark: (className = '') =>
    marketingButtonClasses({
      variant: 'secondary',
      radius: 'full',
      onDarkSecondary: true,
      className,
    }),

  /** Marketing/public form primary submit — `btn-large` tap target + typography */
  formSubmitPrimaryLarge: (className = '') =>
    marketingPrimaryButtonClasses({ radius: 'md', large: true, className }),

  /** Marketing/public form primary submit */
  formSubmitPrimary: (className = '') => marketingPrimaryButtonClasses({ radius: 'md', className }),

  /** Full-width outline next to primary (apply funnel, etc.) */
  formOutlineSecondary: (className = '') => marketingSecondaryButtonClasses({ radius: 'md', className }),

  /** Circular step index inside hero / process */
  stepNumPill: (className = '') => marketingNumPillClasses({ className }),
} as const;
