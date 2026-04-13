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

  if (answers.lowIncomeSelfReport) {
    reasons.push('You indicated household income may be within typical WIOA income guidelines (verify with staff).');
  }
  if (answers.dislocatedWorker) {
    reasons.push('Dislocated worker situations are often eligible for intensive services — staff can confirm.');
  }
  if (answers.trainingInterest) {
    reasons.push('Interest in occupational training aligns with many WIOA-funded pathways.');
  }
  if (answers.primaryBarrier !== 'none') {
    reasons.push(
      `Barrier noted: ${barrierLabel(answers.primaryBarrier)}. One-stop centers can connect support services alongside training.`
    );
  }
  if (answers.completedIntakeSelfReport) {
    reasons.push('You noted you completed intake — your counselor can tie this screen to your case file.');
  }

  let signal: WioaEligibilitySignal = 'review';

  const positiveCount =
    (answers.lowIncomeSelfReport ? 1 : 0) +
    (answers.dislocatedWorker ? 1 : 0) +
    (answers.trainingInterest ? 1 : 0);

  if (positiveCount >= 2 && (answers.ageBracket === '18_24' || answers.ageBracket === '25_54')) {
    signal = 'likely';
  } else if (positiveCount >= 1 || answers.dislocatedWorker) {
    signal = 'possible';
  } else if (answers.ageBracket === 'under18') {
    signal = 'unclear';
    if (reasons.length === 0) {
      reasons.push('Youth programs have different eligibility rules — staff will review age and school status.');
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      'Complete a conversation with WorkforceAP staff or your local American Job Center to confirm WIOA eligibility and next steps.'
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
