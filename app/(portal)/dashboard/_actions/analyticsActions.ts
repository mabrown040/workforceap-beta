'use server';

import { trackCourseraLaunchClicked } from '@/lib/analytics/track';
import { getUser } from '@/lib/auth/server';

export async function logCourseraLaunchFromPortal(courseSlug?: string | null) {
  const user = await getUser();
  if (!user) return;
  trackCourseraLaunchClicked(user.id, { courseSlug: courseSlug ?? undefined });
}
