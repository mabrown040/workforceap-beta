/** Training enrollment / interview scheduling: require contact details only. */
export function memberTrainingProfileComplete(input: {
  phone: string | null | undefined;
  profilePhone: string | null | undefined;
  profileAddress: string | null | undefined;
  financialAidInterest?: boolean | null | undefined;
}): { ok: true } | { ok: false; missing: ('phone' | 'address')[] } {
  const phone = (input.profilePhone?.trim() || input.phone?.trim() || '').length >= 10;
  const address = (input.profileAddress?.trim() || '').length >= 5;
  const missing: ('phone' | 'address')[] = [];
  if (!phone) missing.push('phone');
  if (!address) missing.push('address');
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}
