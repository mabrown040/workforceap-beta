/**
 * Household-size poverty guide for the adult apply / eligibility screeners.
 * Amounts come from the shared 2025 HHS 48-state FPL table in benefitsCliff.
 */

import { annualFpl, FPL_SOURCE } from '@/lib/content/benefitsCliff';

export const HOUSEHOLD_SIZE_OPTIONS = [1, 2, 3, 4] as const;
export type HouseholdSizeOption = (typeof HOUSEHOLD_SIZE_OPTIONS)[number];

export type HouseholdPovertyOption = {
  size: HouseholdSizeOption;
  annualAmount: number;
  label: string;
};

export const HOUSEHOLD_POVERTY_SOURCE = FPL_SOURCE;

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function householdPovertyOptions(): HouseholdPovertyOption[] {
  return HOUSEHOLD_SIZE_OPTIONS.map((size) => {
    const annualAmount = annualFpl(size);
    const people = size === 1 ? '1 person' : `${size} people`;
    return {
      size,
      annualAmount,
      label: `${people} — ${formatUsd(annualAmount)} / year`,
    };
  });
}

export function normalizeHouseholdSize(value: unknown): HouseholdSizeOption | null {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return null;
}

export function povertyGuidelineLabel(size: HouseholdSizeOption | null): string | null {
  if (!size) return null;
  return `${formatUsd(annualFpl(size))} / year for a ${size === 1 ? '1-person' : `${size}-person`} household`;
}
