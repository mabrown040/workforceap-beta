/**
 * Analytics events — pushes to GTM dataLayer for GA4 / tags.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

type EventPayload = {
  event: string;
  [key: string]: unknown;
};

function pushEvent(payload: EventPayload) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

export function trackApplyFunnel(
  step: number,
  stepName: string,
  extra?: Record<string, unknown>
) {
  pushEvent({
    event: 'apply_funnel',
    apply_step: step,
    apply_step_name: stepName,
    ...extra,
  });
}

export function trackLearningHubNavigate(destination: 'career_library' | 'program_resources') {
  pushEvent({
    event: 'learning_hub_navigate',
    learning_hub_destination: destination,
  });
}

export function trackEmployerJobAction(
  action: 'edit' | 'submit_review' | 'close_job' | 'view_applications',
  jobId: string,
  extra?: { status?: string }
) {
  pushEvent({
    event: 'employer_job_action',
    employer_job_action: action,
    job_id: jobId,
    ...extra,
  });
}

export function trackResourceOpen(resourceId: string, resourceTitle: string) {
  pushEvent({
    event: 'resource_open',
    resource_id: resourceId,
    resource_title: resourceTitle,
  });
}

export function trackToolLaunch(toolId: string, toolTitle: string) {
  pushEvent({
    event: 'tool_launch',
    tool_id: toolId,
    tool_title: toolTitle,
  });
}

export function trackLicenseRequest(benefitName: string) {
  pushEvent({
    event: 'license_request',
    benefit_name: benefitName,
  });
}

export function trackBriefOpen(briefId: string, briefTitle: string) {
  pushEvent({
    event: 'brief_open',
    brief_id: briefId,
    brief_title: briefTitle,
  });
}

export function trackApplicationTrackerOpen() {
  pushEvent({
    event: 'application_tracker_open',
  });
}
