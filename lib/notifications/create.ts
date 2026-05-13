import 'server-only';

import { prisma } from '@/lib/db/prisma';

export type NotificationType =
  | 'message'
  | 'course_complete'
  | 'job_match'
  | 'survey_due'
  | 'task_assigned'
  | 'broadcast';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

/**
 * Create a persistent notification for a user.
 * Silently no-ops on error so notification creation never blocks the main flow.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? null,
      },
    });
  } catch (error) {
    console.error('[notification] create failed:', error);
  }
}

/**
 * Create notifications for multiple users (e.g. broadcast).
 * Uses createMany for efficiency.
 */
export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? null,
      })),
    });
  } catch (error) {
    console.error('[notification] bulk create failed:', error);
  }
}
