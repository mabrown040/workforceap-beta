import { invalidateCache } from '@/lib/cache';

/** Invalidate cached job listings (called after admin approval/rejection). */
export async function invalidateJobListings(): Promise<void> {
  await invalidateCache('jobs:list:*');
}
