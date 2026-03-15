/**
 * Member portal analytics events.
 * Pushes to GTM dataLayer for Google Analytics.
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
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(payload);
  }
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
