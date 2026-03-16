'use client';

import { useEffect } from 'react';

export default function ResourceViewTracker({ resourceId }: { resourceId: string }) {
  useEffect(() => {
    fetch(`/api/member/resources/${resourceId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' }),
    }).catch(() => {});
  }, [resourceId]);
  return null;
}
