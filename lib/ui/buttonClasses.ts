/**
 * Shared `.btn` composition — marketing, forms, and portal surfaces.
 *
 * CSS: `css/main.css` (min-height `--btn-min-height` / 44px, radius ladder, variants).
 * Compose: `.btn` + variant + `btn-radius-*` (+ optional modifiers).
 *
 * Variants:
 * — primary: solid magenta (`--color-accent`)
 * — secondary: outline (`onDarkSecondary` on photo/dark scrims)
 * — ghost: text-only (`onDarkGhost` on photo / dark scrims)
 *
 * Radius ladder: sm / md / lg / full → `btn-radius-*`
 */
export const BUTTON_VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
} as const;

export const BUTTON_RADIUS_CLASS = {
  sm: 'btn-radius-sm',
  md: 'btn-radius-md',
  lg: 'btn-radius-lg',
  full: 'btn-radius-full',
} as const;

export const button = {
  base: 'btn',
  variants: BUTTON_VARIANT_CLASS,
  radius: BUTTON_RADIUS_CLASS,
  /** 44×44 circular primary index — pair with `variant: primary` + `radius: full` */
  modifiers: {
    numPill: 'marketing-btn-num-pill',
  },
  onDarkSecondary: 'btn-secondary--on-dark',
  onDarkGhost: 'btn-ghost--on-photo',
  large: 'btn-large',
  fullWidth: 'btn-full-width',
} as const;

export type ButtonVariant = keyof typeof button.variants;
export type ButtonRadius = keyof typeof button.radius;

export type ButtonClassOptions = {
  variant: ButtonVariant;
  /** Defaults to md */
  radius?: ButtonRadius;
  large?: boolean;
  /** Outline / secondary on dark hero scrims */
  onDarkSecondary?: boolean;
  /** Ghost on photo / dark scrims — light text (not magenta default) */
  onDarkGhost?: boolean;
  className?: string;
};

/** Whitespace-joined classes for anchors, buttons, and Link components. */
export function buttonClasses({
  variant,
  radius = 'md',
  large = false,
  onDarkSecondary = false,
  onDarkGhost = false,
  className = '',
}: ButtonClassOptions): string {
  const parts = [
    button.base,
    button.variants[variant],
    button.radius[radius],
    large ? button.large : '',
    variant === 'secondary' && onDarkSecondary ? button.onDarkSecondary : '',
    variant === 'ghost' && onDarkGhost ? button.onDarkGhost : '',
    className,
  ];
  return parts.filter(Boolean).join(' ');
}

export function primaryButtonClasses(options: Omit<ButtonClassOptions, 'variant'> = {}): string {
  return buttonClasses({ variant: 'primary', ...options });
}

export function secondaryButtonClasses(options: Omit<ButtonClassOptions, 'variant'> = {}): string {
  return buttonClasses({ variant: 'secondary', ...options });
}

export function ghostButtonClasses(options: Omit<ButtonClassOptions, 'variant'> = {}): string {
  return buttonClasses({ variant: 'ghost', ...options });
}

/** Numbered pills / step index: solid magenta circle, full radius, 44px min. */
export function numPillClasses(options?: { className?: string }): string {
  return buttonClasses({
    variant: 'primary',
    radius: 'full',
    className: [button.modifiers.numPill, options?.className].filter(Boolean).join(' '),
  });
}

/**
 * Context presets — header / hero / forms / step indices / footer band.
 * All use `.btn` (min-height 44px), variant colors, and `btn-radius-*` ladder.
 */
export const buttonPresets = {
  /** Header “Apply Now” and equivalent nav CTAs */
  navApplyCta: (className = '') =>
    primaryButtonClasses({
      radius: 'md',
      className: ['nav-cta', className].filter(Boolean).join(' '),
    }),

  heroPrimary: (className = '') =>
    buttonClasses({
      variant: 'primary',
      radius: 'lg',
      large: true,
      className,
    }),

  heroSecondaryOnDark: (className = '') =>
    buttonClasses({
      variant: 'secondary',
      radius: 'lg',
      large: true,
      onDarkSecondary: true,
      className,
    }),

  heroGhostOnDark: (className = '') =>
    buttonClasses({
      variant: 'ghost',
      radius: 'md',
      large: true,
      onDarkGhost: true,
      className,
    }),

  /** Numbered hero step row — outline capsule on photo scrim */
  heroStepCapsuleOnDark: (className = '') =>
    buttonClasses({
      variant: 'secondary',
      radius: 'full',
      onDarkSecondary: true,
      className,
    }),

  /** Marketing/public form primary submit — `btn-large` tap target + typography */
  formSubmitPrimaryLarge: (className = '') =>
    primaryButtonClasses({ radius: 'md', large: true, className }),

  /** Marketing/public form primary submit */
  formSubmitPrimary: (className = '') => primaryButtonClasses({ radius: 'md', className }),

  /** Full-width outline next to primary (apply funnel, etc.) */
  formOutlineSecondary: (className = '') => secondaryButtonClasses({ radius: 'md', className }),

  /** Circular step index inside hero / process */
  stepNumPill: (className = '') => numPillClasses({ className }),

  /** Magenta footer band — inverted primary + outline/ghost (see `.footer-cta` in main.css) */
  footerCtaPrimary: (className = '') =>
    primaryButtonClasses({ radius: 'lg', large: true, className }),

  footerCtaSecondary: (className = '') =>
    secondaryButtonClasses({ radius: 'lg', large: true, className }),

  footerCtaGhost: (className = '') => ghostButtonClasses({ radius: 'lg', large: true, className }),
} as const;
