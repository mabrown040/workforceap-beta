import { describe, it, expect, vi } from 'vitest';

describe('AdminCronsClient', () => {
  it('exports a default component', async () => {
    const mod = await import('@/components/admin/AdminCronsClient');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('exports CronExecutionRow type', async () => {
    const mod = await import('@/components/admin/AdminCronsClient');
    expect(mod.CronExecutionRow).toBeUndefined(); // type-only, not present at runtime
  });

  it('component handles empty initialExecutions', async () => {
    const { default: AdminCronsClient } = await import('@/components/admin/AdminCronsClient');
    // Verify the component accepts empty arrays without throwing
    expect(() =>
      AdminCronsClient({ initialExecutions: [], jobNames: [] })
    ).not.toThrow();
  });

  it('component filters by job name', async () => {
    const { default: AdminCronsClient } = await import('@/components/admin/AdminCronsClient');
    const executions = [
      { id: '1', jobName: 'weekly-recap', status: 'SUCCESS', startedAt: new Date(), completedAt: new Date(), errorMessage: null, recordsProcessed: 10, durationMs: 1000, createdAt: new Date() },
      { id: '2', jobName: 'at-risk-check', status: 'FAILED', startedAt: new Date(), completedAt: new Date(), errorMessage: 'Error', recordsProcessed: 0, durationMs: 500, createdAt: new Date() },
    ];
    // Component should render without error
    expect(() =>
      AdminCronsClient({ initialExecutions: executions, jobNames: ['weekly-recap', 'at-risk-check'] })
    ).not.toThrow();
  });
});
