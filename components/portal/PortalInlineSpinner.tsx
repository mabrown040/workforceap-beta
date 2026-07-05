'use client';

import type { CSSProperties } from 'react';
import { Spinner } from '@astryxdesign/core/Spinner';
import type { SpinnerSize } from '@astryxdesign/core/Spinner';

/** Map legacy Lucide pixel sizes → Astryx Spinner sizes. */
export function pixelToSpinnerSize(px: number): SpinnerSize {
  if (px <= 14) return 'sm';
  if (px <= 18) return 'md';
  if (px <= 24) return 'lg';
  return 'xl';
}

interface PortalInlineSpinnerProps {
  /** Legacy Lucide diameter in px (14, 16, 18, 20, 24…). */
  size?: number;
  /** Accessible name; omit when parent button already names the action. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Inline loading indicator for portal buttons and tool forms.
 * Replaces Lucide `Loader2` + `ai-tool-submit-spinner` with Astryx `Spinner`.
 */
export function PortalInlineSpinner({
  size = 16,
  label = 'Loading',
  className,
  style,
}: PortalInlineSpinnerProps) {
  return (
    <Spinner
      size={pixelToSpinnerSize(size)}
      shade="inherit"
      aria-label={label}
      className={className}
      style={style}
    />
  );
}
