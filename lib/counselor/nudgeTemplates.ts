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
};

/**
 * Fill template placeholders. Missing placeholders fall back to neutral
 * generic text so a half-known member doesn't get an obviously templated
 * "{{firstName}}" landing in their inbox.
 */
export function renderNudge(template: NudgeTemplate, ctx: NudgeRenderContext): string {
  const firstName = (ctx.firstName ?? '').trim().split(/\s+/)[0] || 'there';
  const programLabel = (ctx.programLabel ?? '').trim() || 'your training';
  const milestone = (ctx.milestone ?? '').trim() || 'this milestone';
  return template.body
    .replaceAll('{{firstName}}', firstName)
    .replaceAll('{{programLabel}}', programLabel)
    .replaceAll('{{milestone}}', milestone);
}
