/** Coursera enrollment report timestamps are epoch milliseconds, not seconds. */
export function enrollmentActivityMilliseconds(report: {
  lastActivityAt?: unknown;
  lastActivity?: unknown;
}): number | null {
  // Coursera did not exist before 2000. Reject seconds-as-milliseconds and
  // invalid Date values instead of displaying a plausible-looking 1970 date.
  const valid = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)
    && value >= Date.UTC(2000, 0, 1) && value <= 8_640_000_000_000_000;
  if (valid(report.lastActivityAt)) return report.lastActivityAt;
  if (valid(report.lastActivity)) return report.lastActivity;
  return null;
}

/** Shared offset paging rules for both scheduled and direct learner reads. */
export function normalizeCourseraPageOffset(next: unknown): number {
  const offset = typeof next === 'string' && /^\d+$/.test(next) ? Number(next) : next;
  if (typeof offset !== 'number' || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('Coursera returned an unsupported pagination cursor');
  }
  return offset;
}

export function nextEnrollmentReportStart(args: {
  start: number;
  batchLength: number;
  limit: number;
  total?: number;
  next?: number | string;
}): number | null {
  const { start, batchLength, limit, total, next } = args;
  if (next != null) {
    // The documented wire type is string; legacy responses also use numbers.
    // Accept only decimal offsets. Opaque/non-advancing cursors cannot be
    // passed to this client's numeric `start`, so never treat them as complete.
    const offset = normalizeCourseraPageOffset(next);
    if (offset <= start) {
      throw new Error('Coursera returned a non-advancing pagination cursor');
    }
    return offset;
  }
  const knownTotal = typeof total === 'number' && Number.isFinite(total) && total >= 0;
  if (batchLength === 0) {
    if (knownTotal && start < total) {
      throw new Error('Coursera returned an empty page before the reported end');
    }
    return null;
  }
  if (knownTotal && start + batchLength >= total) return null;
  if (!knownTotal && batchLength < limit) return null;
  return start + batchLength;
}
