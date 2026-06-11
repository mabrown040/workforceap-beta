/**
 * Counselor Nudge Templates
 *
 * Three prewritten messages a counselor can send from the triage queue with
 * one click. Voice is intentionally warm-but-direct: WorkforceAP's audience
 * skews toward members who are skeptical of institutional tone, but who
 * respond to genuine, name-using check-ins.
 *
 * **Voice review:** these strings are draft. Mike / Dad should review the
 * voice before this surface goes to a member-facing test cohort. The
 * structure (placeholders, choice point) is what the API consumes; the
 * exact wording can be edited without touching the route or the queue.
 *
 * Placeholders:
 *   {{firstName}}    — member's first name (required)
 *   {{programLabel}} — human-readable program (e.g. "your IT Support track")
 *   {{milestone}}    — milestone-event description (e.g. "finishing your Cloud course")
 */

export type NudgeTemplateId = 'check_in' | 'stalled_step' | 'milestone_celebrate';

export type NudgeTemplate = {
  id: NudgeTemplateId;
  label: string;
  /** Which triage priorities this template is appropriate for. */
  appliesTo: Array<'red' | 'yellow' | 'blue'>;
  body: string;
};

export const NUDGE_TEMPLATES: Record<NudgeTemplateId, NudgeTemplate> = {
  check_in: {
    id: 'check_in',
    label: 'Warm check-in',
    appliesTo: ['red', 'yellow'],
    body:
`Hi {{firstName}} — checking in. Haven't seen you in a bit and wanted to let you know your seat is still here. No pressure, no judgment. If something's in the way, tell me what it is and we'll figure it out together. Reply here when you're ready.`,
  },
  stalled_step: {
    id: 'stalled_step',
    label: 'You stalled — here\'s the next step',
    appliesTo: ['red', 'yellow'],
    body:
`Hi {{firstName}} — looks like {{programLabel}} hit a stop. Most people who pause at this stage just need one piece sorted out (a login, a quiet hour, or a real question we should answer). Reply with what's slowing you down — even one sentence — and we'll move on it the same day.`,
  },
  milestone_celebrate: {
    id: 'milestone_celebrate',
    label: 'Celebrate a milestone',
    appliesTo: ['blue'],
    body:
`{{firstName}} — well done on {{milestone}}. That's a real step, and it counts. Whenever you're ready, the next piece is waiting and we're here to walk through it with you. Proud of you.`,
  },
};

export function listTemplates(): NudgeTemplate[] {
  return Object.values(NUDGE_TEMPLATES);
}

export function getTemplate(id: NudgeTemplateId): NudgeTemplate | null {
  return NUDGE_TEMPLATES[id] ?? null;
}

export type NudgeRenderContext = {
  firstName: string | null | undefined;
  programLabel?: string | null;
  milestone?: string | null;
  /**
   * Self-reported employment barriers (Profile.barrierTypes). Optional and
   * additive — when present, renderNudge appends a short, barrier-aware line so
   * outreach acknowledges the member's real situation with empathy. Omitting it
   * preserves the exact original copy (backward-compatible).
   */
  barrierTypes?: string[] | null;
};

/**
 * Short, dignity-preserving supportive lines keyed by stored barrier value
 * (see DashboardProfileForm BARRIER_OPTIONS). These are appended to a nudge so
 * the member feels seen — never clinical, never pitying. Only the single
 * highest-priority barrier present is used to keep messages from piling up.
 *
 * Ordered by outreach priority: the most acute/time-sensitive situations come
 * first so we lead with the most relevant acknowledgement.
 */
const BARRIER_NUDGE_LINES: Array<{ barrier: string; line: string }> = [
  { barrier: 'homelessness', line: `If a stable place to log in or charge a device is part of the challenge right now, tell me — we have resources and we'll work around it.` },
  { barrier: 'domestic_violence', line: `Your safety comes first. If now isn't a safe or steady time, that's okay — reply whenever you can and we'll meet you where you are.` },
  { barrier: 'housing_instability', line: `If things at home are unsettled right now, you're not behind — let me know and we'll keep your spot flexible and find support if you need it.` },
  { barrier: 'substance_recovery', line: `Recovery takes real strength, and we're in your corner. Go at the pace that protects it — your seat stays open.` },
  { barrier: 'disability', line: `If anything about the format or pace isn't working for you, say the word — we can adjust so it fits how you work best.` },
  { barrier: 'justice_involved', line: `Wherever you've been, what matters here is where you're headed. We'll help you tell that story with confidence.` },
  { barrier: 'employment_gap', line: `A gap in your history doesn't define you — we'll help you frame your time and skills so employers see your real value.` },
  { barrier: 'limited_work_history', line: `Everyone starts somewhere, and we'll help you turn what you've done — in life, school, or volunteering — into a story employers respect.` },
];

/**
 * Pick the single most relevant barrier-aware line for a set of barrier values.
 * Returns an empty string when none apply (or input is empty/'other'/'none').
 */
export function barrierAwareNudgeLine(barrierTypes: string[] | null | undefined): string {
  if (!barrierTypes || barrierTypes.length === 0) return '';
  const present = new Set(barrierTypes);
  const match = BARRIER_NUDGE_LINES.find((b) => present.has(b.barrier));
  return match?.line ?? '';
}

/**
 * Fill template placeholders. Missing placeholders fall back to neutral
 * generic text so a half-known member doesn't get an obviously templated
 * "{{firstName}}" landing in their inbox.
 *
 * When `ctx.barrierTypes` is provided, a single barrier-aware supportive line
 * is appended so the outreach feels personal. Celebration nudges are left
 * untouched — a milestone message shouldn't pivot to barriers.
 */
export function renderNudge(template: NudgeTemplate, ctx: NudgeRenderContext): string {
  const firstName = (ctx.firstName ?? '').trim().split(/\s+/)[0] || 'there';
  const programLabel = (ctx.programLabel ?? '').trim() || 'your training';
  const milestone = (ctx.milestone ?? '').trim() || 'this milestone';
  let rendered = template.body
    .replaceAll('{{firstName}}', firstName)
    .replaceAll('{{programLabel}}', programLabel)
    .replaceAll('{{milestone}}', milestone);

  if (template.id !== 'milestone_celebrate') {
    const barrierLine = barrierAwareNudgeLine(ctx.barrierTypes);
    if (barrierLine) {
      rendered = `${rendered}\n\n${barrierLine}`;
    }
  }

  return rendered;
}
