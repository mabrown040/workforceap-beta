/**
 * Benefits Cliff calculator — Texas-only rules table + 100% deterministic math.
 *
 * Phase 1: NO AI anywhere in this module. The numbers below are a curated,
 * versioned snapshot of published Texas HHS / USDA FNS figures. Every block
 * carries a source citation and a lastVerified date so the table is auditable
 * and easy to refresh when the agencies publish new figures (SNAP figures
 * update every October 1; FPL updates each January).
 *
 * IMPORTANT: this is a simplified estimate. Real eligibility uses deductions
 * (shelter, dependent care, child support), asset tests, and case-by-case
 * rules we do not model. The UI must always show the "estimate, not benefits
 * advice" disclaimer and a counselor follow-up CTA.
 */

export type CliffSource = {
  program: string;
  publisher: string;
  year: string;
  url: string;
  lastVerified: string; // ISO date the figure was last checked against the source
  note?: string;
};

export const BENEFITS_CLIFF_RULES_VERSION = 'TX-2025.10';

/* ────────────────────────────────────────────────────────────────────────────
 * Federal Poverty Level (monthly), 2025 HHS poverty guidelines, 48 states.
 * Annual: $15,650 for 1 person + $5,500 per additional person.
 * ──────────────────────────────────────────────────────────────────────────── */
export const FPL_SOURCE: CliffSource = {
  program: 'Federal Poverty Guidelines (monthly)',
  publisher: 'U.S. Dept. of Health and Human Services (ASPE)',
  year: '2025',
  url: 'https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines',
  lastVerified: '2026-06-11',
};

const FPL_ANNUAL_FIRST_PERSON = 15650;
const FPL_ANNUAL_PER_ADDITIONAL = 5500;

/** Monthly federal poverty level for a household size (2025 guidelines). */
export function monthlyFpl(householdSize: number): number {
  const size = clampHouseholdSize(householdSize);
  return (FPL_ANNUAL_FIRST_PERSON + FPL_ANNUAL_PER_ADDITIONAL * (size - 1)) / 12;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SNAP — FY2025 figures (effective Oct 1, 2024 – Sep 30, 2025), 48 states + DC.
 * Texas follows the standard federal SNAP tables.
 * ──────────────────────────────────────────────────────────────────────────── */
export const SNAP_SOURCE: CliffSource = {
  program: 'SNAP (food benefits) — FY2025 COLA tables',
  publisher: 'USDA Food and Nutrition Service',
  year: 'FY2025 (Oct 2024–Sep 2025)',
  url: 'https://www.fns.usda.gov/snap/allotment/COLA',
  lastVerified: '2026-06-11',
  note: 'Texas applies the standard 48-state tables. See also Texas HHS: https://www.hhs.texas.gov/services/food/snap-food-benefits',
};

export const SNAP_RULES = {
  source: SNAP_SOURCE,
  /** Maximum monthly allotment by household size (1–8). */
  maxAllotment: [292, 536, 768, 975, 1158, 1390, 1536, 1756] as const,
  maxAllotmentPerAdditional: 220,
  /** Gross monthly income limit (130% FPL) by household size (1–8). */
  grossIncomeLimit: [1632, 2215, 2798, 3380, 3963, 4546, 5129, 5712] as const,
  grossIncomeLimitPerAdditional: 583,
  /** Net monthly income limit (100% FPL) by household size (1–8). */
  netIncomeLimit: [1255, 1704, 2152, 2600, 3049, 3497, 3945, 4394] as const,
  netIncomeLimitPerAdditional: 449,
  /** Standard deduction by household size: 1–3 → $204, 4 → $217, 5 → $254, 6+ → $291. */
  standardDeduction: [204, 204, 204, 217, 254, 291] as const,
  /** 20% of earned income is deducted before the benefit calculation. */
  earnedIncomeDeductionRate: 0.2,
  /** Benefit = max allotment − 30% of net income. */
  benefitReductionRate: 0.3,
  /** Minimum monthly benefit for eligible 1–2 person households. */
  minimumBenefitSize1to2: 23,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Medicaid (Texas) — adults and children, plus CHIP.
 * Texas has not expanded Medicaid: coverage for non-disabled adults is
 * limited to parents/caretakers with very low income (~15% FPL).
 * Children: Medicaid up to ~144% FPL; CHIP up to ~201% FPL.
 * ──────────────────────────────────────────────────────────────────────────── */
export const MEDICAID_ADULT_SOURCE: CliffSource = {
  program: 'Texas Medicaid for Parents and Caretaker Relatives',
  publisher: 'Texas Health and Human Services',
  year: '2025',
  url: 'https://www.hhs.texas.gov/services/health/medicaid-chip',
  lastVerified: '2026-06-11',
  note: 'Approximate — Texas caps parent/caretaker Medicaid near 15% of the federal poverty level. Exact limits vary by case; a counselor or YourTexasBenefits.com can confirm.',
};

export const MEDICAID_CHILD_SOURCE: CliffSource = {
  program: "Children's Medicaid and CHIP (Texas)",
  publisher: 'Texas Health and Human Services',
  year: '2025',
  url: 'https://www.hhs.texas.gov/services/health/medicaid-chip/medicaid-chip-programs-services/programs-children-families',
  lastVerified: '2026-06-11',
  note: "Children's Medicaid up to ~144% FPL (ages 1–18; higher for infants); CHIP up to ~201% FPL.",
};

export const MEDICAID_RULES = {
  adultSource: MEDICAID_ADULT_SOURCE,
  childSource: MEDICAID_CHILD_SOURCE,
  /** Parent/caretaker adult Medicaid income cap as a share of FPL (approximate). */
  adultFplCap: 0.15,
  /** Children's Medicaid income cap as a share of FPL (ages 1–18). */
  childMedicaidFplCap: 1.44,
  /** CHIP income cap as a share of FPL. */
  chipFplCap: 2.01,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * TANF (Texas) — cash help for families with children. Texas grants and
 * income limits are very low; the figures below are the published
 * "maximum monthly TANF amounts" / income limits for the most common
 * caretaker cases, indexed by household size (caretaker + children).
 * ──────────────────────────────────────────────────────────────────────────── */
export const TANF_SOURCE: CliffSource = {
  program: 'TANF Cash Help (Texas)',
  publisher: 'Texas Health and Human Services',
  year: '2025',
  url: 'https://www.hhs.texas.gov/services/financial/cash/tanf-cash-help',
  lastVerified: '2026-06-11',
  note: 'Approximate — HHSC publishes grants by family composition (home with one parent vs two). We index by household size for the common one-caretaker case. A counselor can confirm exact amounts.',
};

export const TANF_RULES = {
  source: TANF_SOURCE,
  /**
   * Approximate maximum monthly grant by household size (1–8), one-caretaker
   * household. Size 1 (child-only case) included for completeness.
   */
  maxGrant: [129, 313, 390, 467, 521, 575, 629, 683] as const,
  maxGrantPerAdditional: 54,
  /** Approximate maximum monthly income limit by household size (1–8). */
  incomeLimit: [78, 163, 188, 226, 251, 288, 313, 350] as const,
  incomeLimitPerAdditional: 37,
} as const;

export const ALL_CLIFF_SOURCES: CliffSource[] = [
  FPL_SOURCE,
  SNAP_SOURCE,
  MEDICAID_ADULT_SOURCE,
  MEDICAID_CHILD_SOURCE,
  TANF_SOURCE,
];

/* ────────────────────────────────────────────────────────────────────────────
 * Pure math
 * ──────────────────────────────────────────────────────────────────────────── */

export type CliffProgramId = 'snap' | 'medicaidAdult' | 'medicaidChild' | 'tanf';

export type CliffInput = {
  /** People in the household (1–12; clamped). */
  householdSize: number;
  /** Programs the member currently receives. */
  receives: CliffProgramId[];
  /** Current gross monthly earnings from work (0 if not working). */
  currentMonthlyEarnings: number;
  /** Proposed offer. */
  offerHourlyWage: number;
  offerHoursPerWeek: number;
  /**
   * Optional: the member's actual current monthly SNAP amount. When omitted
   * we estimate it from current earnings using the same formula.
   */
  currentSnapMonthly?: number;
  /** Optional: actual current monthly TANF grant. */
  currentTanfMonthly?: number;
};

export type CliffProgramResult = {
  programId: CliffProgramId;
  /** Whether dollar amounts apply ('cash') or it is coverage-only ('coverage'). */
  kind: 'cash' | 'coverage';
  currentMonthly: number;
  newMonthly: number;
  /** newMonthly − currentMonthly (0 for coverage programs). */
  changeMonthly: number;
  /** Coverage programs: eligibility before/after. Cash programs too, for badges. */
  eligibleNow: boolean;
  eligibleAfter: boolean;
  losesEligibility: boolean;
};

export type CliffVerdict = 'better_off' | 'worse_off' | 'about_the_same';

export type CliffResult = {
  rulesVersion: string;
  /** Gross monthly earnings at the proposed offer. */
  offerMonthlyEarnings: number;
  /** Change in monthly earnings (offer − current). */
  earningsChangeMonthly: number;
  /** Change in cash benefits across SNAP + TANF. */
  benefitsChangeMonthly: number;
  /** earningsChange + benefitsChange. */
  netChangeMonthly: number;
  verdict: CliffVerdict;
  /** True when the member risks losing Medicaid/CHIP coverage (not in dollars). */
  losesHealthCoverage: boolean;
  programs: CliffProgramResult[];
};

/** Dollar band inside which we call the outcome "about the same". */
export const ABOUT_THE_SAME_BAND = 50;

const MAX_HOUSEHOLD_SIZE = 12;

export function clampHouseholdSize(size: number): number {
  if (!Number.isFinite(size)) return 1;
  return Math.min(MAX_HOUSEHOLD_SIZE, Math.max(1, Math.floor(size)));
}

/** Table lookup for size-indexed arrays (1–8) with a per-additional increment. */
function tableValue(table: readonly number[], perAdditional: number, householdSize: number): number {
  const size = clampHouseholdSize(householdSize);
  if (size <= table.length) return table[size - 1];
  return table[table.length - 1] + perAdditional * (size - table.length);
}

/** Convert an hourly wage + hours/week into gross monthly earnings (52 weeks / 12 months). */
export function monthlyEarnings(hourlyWage: number, hoursPerWeek: number): number {
  const wage = Math.max(0, hourlyWage);
  const hours = Math.max(0, hoursPerWeek);
  return round2((wage * hours * 52) / 12);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function snapStandardDeduction(householdSize: number): number {
  const size = clampHouseholdSize(householdSize);
  const t = SNAP_RULES.standardDeduction;
  return size <= t.length ? t[size - 1] : t[t.length - 1];
}

/**
 * Estimated monthly SNAP benefit for a household whose only countable income
 * is earned income. Simplified: ignores shelter/dependent-care/medical
 * deductions, so real benefits are often somewhat higher near the limits.
 */
export function estimateSnapMonthly(householdSize: number, grossMonthlyEarnings: number): number {
  const size = clampHouseholdSize(householdSize);
  const gross = Math.max(0, grossMonthlyEarnings);

  const grossLimit = tableValue(SNAP_RULES.grossIncomeLimit, SNAP_RULES.grossIncomeLimitPerAdditional, size);
  if (gross > grossLimit) return 0;

  const net = Math.max(
    0,
    gross - gross * SNAP_RULES.earnedIncomeDeductionRate - snapStandardDeduction(size)
  );
  const netLimit = tableValue(SNAP_RULES.netIncomeLimit, SNAP_RULES.netIncomeLimitPerAdditional, size);
  if (net > netLimit) return 0;

  const maxAllotment = tableValue(SNAP_RULES.maxAllotment, SNAP_RULES.maxAllotmentPerAdditional, size);
  let benefit = maxAllotment - SNAP_RULES.benefitReductionRate * net;
  // Eligible 1–2 person households get at least the minimum benefit.
  if (size <= 2) benefit = Math.max(benefit, SNAP_RULES.minimumBenefitSize1to2);
  if (benefit <= 0) return 0;
  return round2(benefit);
}

/** Whether a Texas parent/caretaker adult keeps Medicaid at this income (approximate). */
export function isAdultMedicaidEligible(householdSize: number, grossMonthlyEarnings: number): boolean {
  return Math.max(0, grossMonthlyEarnings) <= monthlyFpl(householdSize) * MEDICAID_RULES.adultFplCap;
}

/** Whether children keep Medicaid or CHIP coverage at this income (CHIP cap, ~201% FPL). */
export function isChildCoverageEligible(householdSize: number, grossMonthlyEarnings: number): boolean {
  return Math.max(0, grossMonthlyEarnings) <= monthlyFpl(householdSize) * MEDICAID_RULES.chipFplCap;
}

/** Estimated monthly TANF grant. Simplified: all-or-nothing at the income limit. */
export function estimateTanfMonthly(householdSize: number, grossMonthlyEarnings: number): number {
  const size = clampHouseholdSize(householdSize);
  const limit = tableValue(TANF_RULES.incomeLimit, TANF_RULES.incomeLimitPerAdditional, size);
  if (Math.max(0, grossMonthlyEarnings) > limit) return 0;
  return tableValue(TANF_RULES.maxGrant, TANF_RULES.maxGrantPerAdditional, size);
}

/**
 * The core deterministic computation: compare household finances at current
 * earnings vs. the proposed offer, program by program.
 */
export function computeCliff(input: CliffInput): CliffResult {
  const size = clampHouseholdSize(input.householdSize);
  const current = Math.max(0, input.currentMonthlyEarnings || 0);
  const offer = monthlyEarnings(input.offerHourlyWage, input.offerHoursPerWeek);
  const receives = new Set(input.receives);

  const programs: CliffProgramResult[] = [];

  if (receives.has('snap')) {
    const estimatedNow = estimateSnapMonthly(size, current);
    const currentMonthly =
      typeof input.currentSnapMonthly === 'number' && input.currentSnapMonthly >= 0
        ? round2(input.currentSnapMonthly)
        : estimatedNow;
    const newMonthly = estimateSnapMonthly(size, offer);
    programs.push({
      programId: 'snap',
      kind: 'cash',
      currentMonthly,
      newMonthly,
      changeMonthly: round2(newMonthly - currentMonthly),
      eligibleNow: currentMonthly > 0,
      eligibleAfter: newMonthly > 0,
      losesEligibility: currentMonthly > 0 && newMonthly === 0,
    });
  }

  if (receives.has('medicaidAdult')) {
    const eligibleNow = isAdultMedicaidEligible(size, current);
    const eligibleAfter = isAdultMedicaidEligible(size, offer);
    programs.push({
      programId: 'medicaidAdult',
      kind: 'coverage',
      currentMonthly: 0,
      newMonthly: 0,
      changeMonthly: 0,
      eligibleNow,
      eligibleAfter,
      losesEligibility: eligibleNow && !eligibleAfter,
    });
  }

  if (receives.has('medicaidChild')) {
    const eligibleNow = isChildCoverageEligible(size, current);
    const eligibleAfter = isChildCoverageEligible(size, offer);
    programs.push({
      programId: 'medicaidChild',
      kind: 'coverage',
      currentMonthly: 0,
      newMonthly: 0,
      changeMonthly: 0,
      eligibleNow,
      eligibleAfter,
      losesEligibility: eligibleNow && !eligibleAfter,
    });
  }

  if (receives.has('tanf')) {
    const estimatedNow = estimateTanfMonthly(size, current);
    const currentMonthly =
      typeof input.currentTanfMonthly === 'number' && input.currentTanfMonthly >= 0
        ? round2(input.currentTanfMonthly)
        : estimatedNow;
    const newMonthly = estimateTanfMonthly(size, offer);
    programs.push({
      programId: 'tanf',
      kind: 'cash',
      currentMonthly,
      newMonthly,
      changeMonthly: round2(newMonthly - currentMonthly),
      eligibleNow: currentMonthly > 0,
      eligibleAfter: newMonthly > 0,
      losesEligibility: currentMonthly > 0 && newMonthly === 0,
    });
  }

  const earningsChangeMonthly = round2(offer - current);
  const benefitsChangeMonthly = round2(
    programs.filter((p) => p.kind === 'cash').reduce((sum, p) => sum + p.changeMonthly, 0)
  );
  const netChangeMonthly = round2(earningsChangeMonthly + benefitsChangeMonthly);

  let verdict: CliffVerdict;
  if (netChangeMonthly > ABOUT_THE_SAME_BAND) verdict = 'better_off';
  else if (netChangeMonthly < -ABOUT_THE_SAME_BAND) verdict = 'worse_off';
  else verdict = 'about_the_same';

  return {
    rulesVersion: BENEFITS_CLIFF_RULES_VERSION,
    offerMonthlyEarnings: offer,
    earningsChangeMonthly,
    benefitsChangeMonthly,
    netChangeMonthly,
    verdict,
    losesHealthCoverage: programs.some((p) => p.kind === 'coverage' && p.losesEligibility),
    programs,
  };
}
