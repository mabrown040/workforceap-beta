/**
 * Self-service WIA/WIOA-style screening — informational only, not a legal eligibility determination.
 */

export type WioaBarrier =
  | 'none'
  | 'basic_skills'
  | 'english_language'
  | 'criminal_record'
  | 'transportation'
  | 'childcare'
  | 'housing'
  | 'other';

export type WioaQualificationAnswers = {
  /** Age 14+ for WIOA youth programs; 18+ for adult */
  ageBracket: 'under18' | '18_24' | '25_54' | '55_plus';
  countyOrZip: string;
  /** Primary barrier to employment or training */
  primaryBarrier: WioaBarrier;
  /** Receiving or recently received unemployment / layoff */
  dislocatedWorker: boolean;
  /** Household income roughly at or below self-sufficiency (self-reported) */
  lowIncomeSelfReport: boolean;
  /** Interested in training for in-demand occupation */
  trainingInterest: boolean;
  /** Completed orientation or intake with WorkforceAP (self-reported) */
  completedIntakeSelfReport: boolean;
};

export type WioaEligibilitySignal = 'likely' | 'possible' | 'review' | 'unclear';

export type WioaQualificationSnapshot = {
  answers: WioaQualificationAnswers;
  signal: WioaEligibilitySignal;
  reasons: string[];
  submittedAt: string;
  version: 1;
};

export function parseWioaQualificationSnapshot(raw: unknown): WioaQualificationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.submittedAt !== 'string' || typeof o.signal !== 'string') return null;
  return o as unknown as WioaQualificationSnapshot;
}

const BARRIER_LABELS: Record<WioaBarrier, string> = {
  none: 'No major barrier right now',
  basic_skills: 'Basic skills / digital literacy',
  english_language: 'English language support',
  criminal_record: 'Background / record questions',
  transportation: 'Transportation',
  childcare: 'Childcare',
  housing: 'Housing stability',
  other: 'Other',
};

export function barrierLabel(b: WioaBarrier): string {
  return BARRIER_LABELS[b] ?? b;
}

/**
 * Heuristic signal for UI routing — counselors make final WIOA determinations.
 */
export function computeWioaSignal(answers: WioaQualificationAnswers): {
  signal: WioaEligibilitySignal;
  reasons: string[];
} {
  const reasons: string[] = [];
  const hasBarrier = answers.primaryBarrier !== 'none';
  const isYouth = answers.ageBracket === 'under18';
  const coreQualifierCount =
    (answers.lowIncomeSelfReport ? 1 : 0) +
    (answers.dislocatedWorker ? 1 : 0) +
    (hasBarrier ? 1 : 0);

  if (answers.lowIncomeSelfReport) {
    reasons.push('Your income level may qualify you for free, federally funded training — a staff member can verify the details.');
  }
  if (answers.dislocatedWorker) {
    reasons.push('Being unemployed or recently laid off may qualify you for funded training support through a federal workforce program.');
  }
  if (hasBarrier) {
    reasons.push(
      `You identified a barrier, ${barrierLabel(answers.primaryBarrier)}, which can strengthen your case for additional support services alongside training.`
    );
  }
  if (answers.trainingInterest) {
    reasons.push('Your interest in training for an in-demand career is a strong match for free, funded training programs.');
  }
  if (answers.completedIntakeSelfReport) {
    reasons.push('You said you already completed intake or orientation, which can help staff move faster on your next steps.');
  }

  let signal: WioaEligibilitySignal = 'review';

  if (isYouth) {
    signal = coreQualifierCount >= 1 || answers.trainingInterest ? 'possible' : 'unclear';
    reasons.push('Youth eligibility is reviewed differently, so WorkforceAP staff will confirm age, school status, and program fit.');
  } else if (answers.dislocatedWorker) {
    signal = 'likely';
  } else if (
    (answers.lowIncomeSelfReport && hasBarrier) ||
    coreQualifierCount >= 2 ||
    (answers.lowIncomeSelfReport && answers.completedIntakeSelfReport)
  ) {
    signal = 'likely';
  } else if (coreQualifierCount >= 1 || answers.trainingInterest || answers.completedIntakeSelfReport) {
    signal = 'possible';
  }

  if (reasons.length === 0) {
    reasons.push(
      'Talk with a WorkforceAP counselor or visit your local American Job Center to learn which free training programs you may qualify for.'
    );
  }

  return { signal, reasons };
}

export function parseWioaAnswers(raw: unknown): WioaQualificationAnswers | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const ageBracket = o.ageBracket;
  const primaryBarrier = o.primaryBarrier;
  if (
    ageBracket !== 'under18' &&
    ageBracket !== '18_24' &&
    ageBracket !== '25_54' &&
    ageBracket !== '55_plus'
  ) {
    return null;
  }
  if (
    typeof o.countyOrZip !== 'string' ||
    typeof o.dislocatedWorker !== 'boolean' ||
    typeof o.lowIncomeSelfReport !== 'boolean' ||
    typeof o.trainingInterest !== 'boolean' ||
    typeof o.completedIntakeSelfReport !== 'boolean'
  ) {
    return null;
  }
  const barriers: WioaBarrier[] = [
    'none',
    'basic_skills',
    'english_language',
    'criminal_record',
    'transportation',
    'childcare',
    'housing',
    'other',
  ];
  if (!barriers.includes(primaryBarrier as WioaBarrier)) return null;

  return {
    ageBracket,
    countyOrZip: o.countyOrZip.trim().slice(0, 120),
    primaryBarrier: primaryBarrier as WioaBarrier,
    dislocatedWorker: o.dislocatedWorker,
    lowIncomeSelfReport: o.lowIncomeSelfReport,
    trainingInterest: o.trainingInterest,
    completedIntakeSelfReport: o.completedIntakeSelfReport,
  };
}
