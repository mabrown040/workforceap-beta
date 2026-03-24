/** Training enrollment / interview scheduling: require contact + financial aid answer. */
export function memberTrainingProfileComplete(input: {
  phone: string | null | undefined;
  profilePhone: string | null | undefined;
  profileAddress: string | null | undefined;
  financialAidInterest: boolean | null | undefined;
}): { ok: true } | { ok: false; missing: ('phone' | 'address' | 'financial_aid')[] } {
  const phone = (input.profilePhone?.trim() || input.phone?.trim() || '').length >= 10;
  const address = (input.profileAddress?.trim() || '').length >= 5;
  const aid = input.financialAidInterest === true || input.financialAidInterest === false;
  const missing: ('phone' | 'address' | 'financial_aid')[] = [];
  if (!phone) missing.push('phone');
  if (!address) missing.push('address');
  if (!aid) missing.push('financial_aid');
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}
