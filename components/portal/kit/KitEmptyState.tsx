'use client';

import { EmptyState } from '@astryxdesign/core/EmptyState';

/** Serializable empty placeholder for server-rendered DataTable shells. */
export function KitEmptyState({ title, description }: { title: string; description?: string }) {
  return <EmptyState title={title} description={description} />;
}
