import { isValidPostalCode } from '@/lib/validation/postalCode';

export type StarterProfileField = 'phone' | 'address' | 'city' | 'state' | 'zip' | 'referralSource';

export const STARTER_PROFILE_FIELD_LABELS: Record<StarterProfileField, string> = {
  phone: 'phone number',
  address: 'street address',
  city: 'city',
  state: 'state',
  zip: 'ZIP code',
  referralSource: 'referral source',
};

export function getStarterProfileFieldLabels(fields: StarterProfileField[]): string[] {
  return fields.map((field) => STARTER_PROFILE_FIELD_LABELS[field]);
}

export function getCounselorStarterProfileReview(input: {
  wasCounselorCreated: boolean;
  phone?: string | null;
  profilePhone?: string | null;
  profileAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  referralSource?: string | null;
}): { required: false; missing: [] } | { required: true; missing: StarterProfileField[] } {
  if (!input.wasCounselorCreated) {
    return { required: false, missing: [] };
  }

  const missing: StarterProfileField[] = [];
  const phoneDigits = (input.profilePhone?.trim() || input.phone?.trim() || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) missing.push('phone');
  if ((input.profileAddress?.trim() || '').length < 5) missing.push('address');
  if (!(input.city?.trim() || '')) missing.push('city');
  if (!(input.state?.trim() || '')) missing.push('state');
  if (!isValidPostalCode(input.zip?.trim() || '')) missing.push('zip');
  if (!(input.referralSource?.trim() || '')) missing.push('referralSource');

  if (missing.length === 0) {
    return { required: false, missing: [] };
  }

  return { required: true, missing };
}
