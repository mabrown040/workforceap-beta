'use client';

import {
  APPLY_HEAR_ABOUT_GROUPS,
  APPLY_PARTNER_REFERRAL_OPTIONS,
} from '@/lib/apply/eligibilityExtendedFields';

/** Native <option> groups so the opened hear-about menu is visibly populated. */
export function HearAboutSelectOptions() {
  return (
    <>
      {APPLY_HEAR_ABOUT_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function PartnerReferralSelectOptions() {
  return (
    <>
      {APPLY_PARTNER_REFERRAL_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </>
  );
}
