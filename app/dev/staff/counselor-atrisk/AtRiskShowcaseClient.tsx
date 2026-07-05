'use client';

import { useCallback, useState } from 'react';
import { AtRiskDashboardView, type AtRiskMember } from '@/components/portal/counselor/AtRiskDashboard';

/**
 * Thin client wrapper around the presentational `AtRiskDashboardView` for the
 * dev showcase. Mimics the real container's mutation callbacks (Ack/Resolve/
 * bulk-acknowledge) against local state only — no network, no DB — so the
 * buttons feel alive in a screenshot/QA pass without hitting a real API.
 */
export default function AtRiskShowcaseClient({ initialMembers }: { initialMembers: AtRiskMember[] }) {
  const [members, setMembers] = useState<AtRiskMember[]>(initialMembers);

  const onUpdateStatus = useCallback(
    async (alertId: string, status: 'acknowledged' | 'resolved' | 'escalated') => {
      setMembers((prev) => prev.map((m) => (m.alertId === alertId ? { ...m, status } : m)));
    },
    [],
  );

  const onBulkAcknowledge = useCallback(async (alertIds: string[]) => {
    setMembers((prev) => prev.map((m) => (alertIds.includes(m.alertId) ? { ...m, status: 'acknowledged' as const } : m)));
    return { failed: 0, total: alertIds.length };
  }, []);

  return (
    <AtRiskDashboardView
      members={members}
      loading={false}
      error={null}
      onRetry={() => {}}
      onUpdateStatus={onUpdateStatus}
      onBulkAcknowledge={onBulkAcknowledge}
    />
  );
}
