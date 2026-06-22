export type AdminCommandCenterBaseRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
};

export type AdminNeedsReplyRow = AdminCommandCenterBaseRow & {
  threadId: string;
  lastMessageBody: string | null;
  lastMessageAt: Date;
  hoursWaiting: number;
};

export type AdminAtRiskRow = AdminCommandCenterBaseRow & {
  daysInactive: number;
  enrolledProgram: string | null;
};

export type AdminInterviewingRow = AdminCommandCenterBaseRow & {
  company: string;
  role: string;
  statusLabel: string;
  nextInterviewDate: Date | null;
};

export type ApplicationEmailPacket = {
  subject: string;
  body: string;
  mailto: string;
};

export type AdminApplicationPendingRow = AdminCommandCenterBaseRow & {
  applicationId: string;
  phone: string | null;
  programLabel: string;
  status: 'PENDING' | 'NEEDS_INFO';
  statusLabel: string;
  submittedAt: Date | null;
  submittedDaysAgo: number | null;
  recommendedCareerTitle: string | null;
  emailPacket: ApplicationEmailPacket;
};

export type AdminCommandCenterTotals = {
  needsReplyCount: number;
  atRiskCount: number;
  interviewingCount: number;
  applicationsPendingCount: number;
  certificationsPendingCount: number;
  oldestPendingApplicationDays: number | null;
};

/**
 * One program's enrollment count for the "Program Health" breakdown.
 * `label` is the catalog title (falls back to the raw slug), `count` is the
 * number of enrolled members in that program (scoped to the org). `pct` is the
 * share relative to the top program's count (0–100), so bars render correctly.
 */
export type AdminProgramHealthRow = {
  programSlug: string;
  label: string;
  count: number;
  pct: number;
};

export type AdminCommandCenter = {
  needsReply: AdminNeedsReplyRow[];
  atRisk: AdminAtRiskRow[];
  interviewing: AdminInterviewingRow[];
  applicationsPending: AdminApplicationPendingRow[];
  programHealth: AdminProgramHealthRow[];
  totals: AdminCommandCenterTotals;
};

export function buildApplicationEmailPacket({
  applicantName,
  applicantEmail,
  programLabel,
  submittedDaysAgo,
  recommendedCareerTitle,
}: {
  applicantName: string;
  applicantEmail: string;
  programLabel: string;
  submittedDaysAgo: number | null;
  recommendedCareerTitle: string | null;
}): ApplicationEmailPacket {
  const firstName = applicantName.trim().split(/\s+/)[0] || 'there';
  const submittedPhrase =
    submittedDaysAgo == null
      ? 'recently'
      : submittedDaysAgo === 0
        ? 'today'
        : `${submittedDaysAgo} ${submittedDaysAgo === 1 ? 'day' : 'days'} ago`;
  const careerLine = recommendedCareerTitle
    ? `\nI also saw ${recommendedCareerTitle} in your career match, so I want to make sure the next step fits where you want to go.\n`
    : '\n';
  const subject = 'Next steps for your WorkforceAP application';
  const body = [
    `Hi ${firstName},`,
    '',
    `I reviewed your WorkforceAP application for ${programLabel}. You sent it ${submittedPhrase}.`,
    careerLine.trim(),
    'The next step is a quick review so we can confirm the right training path and any support you need.',
    '',
    'Can you reply with a good time today or tomorrow for a 10-minute check-in?',
    '',
    'Thanks,',
    'WorkforceAP',
  ].filter(Boolean).join('\n');

  return {
    subject,
    body,
    mailto: `mailto:${encodeURIComponent(applicantEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

/**
 * Derives the headline totals from the loaded buckets. `certificationsPendingCount`
 * is sourced from a cheap org-scoped count (not a row array on `center`, which only
 * tracks a capped per-section slice), so it's passed in explicitly and defaults to 0.
 */
export function bucketCommandCenterTotals(
  center: AdminCommandCenter,
  extras?: { certificationsPendingCount?: number },
): AdminCommandCenterTotals {
  return {
    needsReplyCount: center.needsReply.length,
    atRiskCount: center.atRisk.length,
    interviewingCount: center.interviewing.length,
    applicationsPendingCount: center.applicationsPending.length,
    certificationsPendingCount: extras?.certificationsPendingCount ?? 0,
    oldestPendingApplicationDays: center.applicationsPending.reduce<number | null>((oldest, row) => {
      if (row.submittedDaysAgo == null) return oldest;
      return oldest == null ? row.submittedDaysAgo : Math.max(oldest, row.submittedDaysAgo);
    }, null),
  };
}
