/**
 * Self-service WIOA screening — informational only, not a legal eligibility determination.
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
  /**
   * Receiving TANF, WIC, and/or SNAP (food stamps). Added 9/2/26; optional so
   * snapshots saved before the question existed still parse (null = not asked).
   */
  publicAssistanceSelfReport?: boolean | null;
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
  const signal = o.signal;
  if (
    o.version !== 1 ||
    typeof o.submittedAt !== 'string' ||
    (signal !== 'likely' && signal !== 'possible' && signal !== 'review' && signal !== 'unclear') ||
    !Array.isArray(o.reasons) ||
    !o.reasons.every((reason) => typeof reason === 'string')
  ) {
    return null;
  }
  const answers = parseWioaAnswers(o.answers);
  if (!answers) return null;
  return {
    answers,
    signal,
    reasons: o.reasons,
    submittedAt: o.submittedAt,
    version: 1,
  };
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

/** Staff-facing Yes / No / Not answered label for the TANF / WIC / SNAP question. */
export function publicAssistanceLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not answered';
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
  const receivesPublicAssistance = answers.publicAssistanceSelfReport === true;
  // Receiving TANF / SNAP is itself a WIOA low-income indicator, so it counts
  // the same way as the self-reported income question.
  const lowIncome = answers.lowIncomeSelfReport || receivesPublicAssistance;
  const coreQualifierCount =
    (lowIncome ? 1 : 0) +
    (answers.dislocatedWorker ? 1 : 0) +
    (hasBarrier ? 1 : 0);

  if (receivesPublicAssistance) {
    reasons.push('You shared that you receive TANF, WIC, or SNAP (food stamps), which usually meets WIOA low-income guidelines once staff verify it.');
  }
  if (answers.lowIncomeSelfReport) {
    reasons.push('You shared that your household income may fit common WIOA income guidelines, which staff can verify.');
  }
  if (answers.dislocatedWorker) {
    reasons.push('You reported being unemployed or laid off, which often fits WIOA dislocated worker pathways.');
  }
  if (hasBarrier) {
    reasons.push(
      `You identified a barrier, ${barrierLabel(answers.primaryBarrier)}, which can strengthen the case for supportive services alongside training.`
    );
  }
  if (answers.trainingInterest) {
    reasons.push('You said you want training for an in-demand occupation, which is a strong match for many WIOA-funded plans.');
  }
  if (answers.completedIntakeSelfReport) {
    reasons.push('You said you already completed intake or orientation, which can help staff move faster on next steps.');
  }

  let signal: WioaEligibilitySignal = 'review';

  if (isYouth) {
    signal = coreQualifierCount >= 1 || answers.trainingInterest ? 'possible' : 'unclear';
    reasons.push('Youth eligibility is reviewed differently, so WorkforceAP staff will confirm age, school status, and program fit.');
  } else if (answers.dislocatedWorker) {
    signal = 'likely';
  } else if (
    (lowIncome && hasBarrier) ||
    coreQualifierCount >= 2 ||
    (lowIncome && answers.completedIntakeSelfReport)
  ) {
    signal = 'likely';
  } else if (coreQualifierCount >= 1 || answers.trainingInterest || answers.completedIntakeSelfReport) {
    signal = 'possible';
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
  // Optional: older snapshots never asked this, and a non-boolean value must not
  // invalidate the rest of the screening.
  const publicAssistanceSelfReport =
    typeof o.publicAssistanceSelfReport === 'boolean' ? o.publicAssistanceSelfReport : null;

  return {
    ageBracket,
    countyOrZip: o.countyOrZip.trim().slice(0, 120),
    primaryBarrier: primaryBarrier as WioaBarrier,
    dislocatedWorker: o.dislocatedWorker,
    lowIncomeSelfReport: o.lowIncomeSelfReport,
    trainingInterest: o.trainingInterest,
    completedIntakeSelfReport: o.completedIntakeSelfReport,
    publicAssistanceSelfReport,
  };
}
