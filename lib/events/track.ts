import { prisma } from '@/lib/db/prisma';

export type EventName =
  | 'member_logged_in'
  | 'member_logged_out'
  | 'dashboard_viewed'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_completed'
  | 'resource_viewed'
  | 'resource_downloaded'
  | 'resource_saved'
  | 'resource_completed'
  | 'ai_tool_opened'
  | 'ai_tool_submitted'
  | 'ai_tool_result_saved'
  | 'ai_result_viewed'
  | 'pathway_started'
  | 'pathway_step_completed'
  | 'pathway_completed'
  | 'certification_marked_complete'
  | 'application_added'
  | 'application_updated'
  | 'application_status_changed'
  | 'weekly_recap_generated'
  | 'weekly_recap_viewed'
  | 'training_access_requested'
  | 'training_access_approved'
  | 'training_access_activated';

type TrackEventParams = {
  userId: string;
  eventName: EventName;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  sourcePage?: string;
  sessionId?: string;
};

/**
 * Track a member event. Non-blocking - logs errors but does not throw.
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    await prisma.memberEvent.create({
      data: {
        userId: params.userId,
        eventName: params.eventName,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        sourcePage: params.sourcePage ?? null,
        sessionId: params.sessionId ?? null,
      },
    });
  } catch (err) {
    console.error('[trackEvent]', err);
  }
}
