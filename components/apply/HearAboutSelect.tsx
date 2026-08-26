'use client';

import type { CSSProperties } from 'react';
import { APPLY_HEAR_ABOUT_OPTIONS } from '@/lib/apply/eligibilityExtendedFields';
import { HearAboutSelectOptions } from '@/components/apply/HearAboutSelectOptions';

type Props = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  'aria-invalid'?: boolean;
};

const LISTED = APPLY_HEAR_ABOUT_OPTIONS as readonly string[];

/**
 * Shared "How did you hear about WorkforceAP?" select. Options are always
 * the static Central Texas list (plus partner/ambassador) so the menu cannot
 * render empty when an API/DB lookup fails.
 */
export default function HearAboutSelect({
  id,
  name,
  value,
  onChange,
  required,
  disabled,
  placeholder = 'Choose from this list',
  className,
  style,
  'aria-invalid': ariaInvalid,
}: Props) {
  const extraValue = value && !LISTED.includes(value) ? value : null;
  const selectClassName = ['hear-about-select', className].filter(Boolean).join(' ');

  return (
    <select
      id={id}
      name={name}
      className={selectClassName}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      aria-invalid={ariaInvalid}
    >
      <option value="">{placeholder}</option>
      {extraValue ? <option value={extraValue}>{extraValue}</option> : null}
      <HearAboutSelectOptions />
    </select>
  );
}
