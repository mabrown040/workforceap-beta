import { prisma } from '@/lib/db/prisma';
import { getRequestId } from '@/lib/observability/requestId';
import { logger } from '@/lib/observability/logger';

export type EventName =
  | 'member_logged_in'
  | 'member_logged_out'
  | 'email_verified'
  | 'dashboard_viewed'
  | 'member_dashboard_viewed'
  | 'member_dashboard_action_clicked'
  | 'first_value_panel_rendered'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_completed'
  | 'resource_viewed'
  | 'resource_downloaded'
  | 'resource_saved'
  | 'resource_completed'
  | 'ai_tool_opened'
  | 'journey_stage_selected'
  | 'ai_tool_run_started'
  | 'ai_tool_submitted'
  | 'ai_tool_run_completed'
  | 'ai_tool_result_saved'
  | 'ai_result_viewed'
  | 'pathway_started'
  | 'pathway_step_completed'
  | 'pathway_completed'
  | 'certification_marked_complete'
  | 'certification_earned'
  | 'program_enrolled'
  | 'program_change_approved'
  | 'course_completed'
  | 'placement_recorded'
  | 'application_added'
  | 'application_updated'
  | 'application_status_changed'
  | 'apply_step_completed'
  | 'apply_signup_started'
  | 'apply_signup_completed'
  | 'email_verified'
  | 'employer_import_started'
  | 'employer_import_succeeded'
  | 'employer_import_fallback_used'
  | 'feedback_submitted'
  | 'employer_job_draft_saved'
  | 'employer_job_submitted_for_review'
  | 'employer_job_posted_live'
  | 'admin_review_queue_viewed'
  | 'admin_job_review_viewed'
  | 'admin_recommendations_inspected'
  | 'weekly_recap_generated'
  | 'weekly_recap_viewed'
  | 'training_access_requested'
  | 'training_access_approved'
  | 'training_access_activated'
  | 'partner_invite_sent'
  | 'milestone_cascade_sent'
  | 'milestone_cascade_dismissed'
  | 'skill_checkpoint_completed';

type TrackEventParams = {
  userId: string;
  eventName: EventName;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  sourcePage?: string;
  sessionId?: string;
  /**
   * Optional override. When omitted the current request's `x-request-id`
   * is read from AsyncLocalStorage so we don't have to thread it through
   * every callsite.
   */
  requestId?: string;
};

/**
 * Track a member event. Non-blocking - logs errors but does not throw.
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  const requestId = params.requestId ?? getRequestId() ?? null;
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
        requestId,
      },
    });
  } catch (err) {
    logger.error('trackEvent failed', {
      eventName: params.eventName,
      userId: params.userId,
      err,
    });
  }
}
