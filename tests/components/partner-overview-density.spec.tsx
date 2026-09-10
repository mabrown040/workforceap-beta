import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PartnerAttentionCard, PartnerKpiGrid, PartnerReferralFunnel } from '@/components/portal/kit/pages/PartnerOverviewKit';

describe('compact partner overview', () => {
  it('preserves values and keeps each qualification inside its metric', () => {
    render(<PartnerKpiGrid items={[
      { label: 'Members referred', value: 12, subtitle: 'In your portal' },
      { label: 'Members enrolled', value: 6, subtitle: 'Started a program' },
      { label: 'Placement rate', value: '25%', subtitle: 'Recorded placements' },
      { label: 'Payout due', value: '$3,000', subtitle: 'Placement estimate' },
    ]} />);
    for (const [label, value, caption] of [
      ['Members referred', '12', 'In your portal'],
      ['Members enrolled', '6', 'Started a program'],
      ['Placement rate', '25%', 'Recorded placements'],
      ['Payout due', '$3,000', 'Placement estimate'],
    ]) {
      const card = screen.getByText(label).closest('.wa-kit-card')!;
      expect(within(card as HTMLElement).getByText(value)).toBeVisible();
      expect(within(card as HTMLElement).getByText(caption)).toBeVisible();
    }
  });

  it('preserves supplied funnel values and exposes named percentages', () => {
    render(<PartnerReferralFunnel stages={[
      { label: 'Referred', value: 12, pct: 100 },
      { label: 'Enrolled', value: 6, pct: 50 },
      { label: 'Placed', value: 0, pct: 0 },
    ]} />);
    expect(screen.getByRole('progressbar', { name: 'Referred as a share of referrals' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Enrolled as a share of referrals' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('progressbar', { name: 'Placed as a share of referrals' })).toHaveAttribute('aria-valuenow', '0');
    expect(within(screen.getByRole('region', { name: 'Placed' })).getByText('0')).toBeVisible();
  });

  it('keeps the progress handoff a direct link without adding a new action', () => {
    render(<PartnerAttentionCard title="Track member progress" body="Follow their outcomes." href="/partner/referred-members" />);
    expect(screen.getByRole('link', { name: 'Track member progress Follow their outcomes.' })).toHaveAttribute('href', '/partner/referred-members');
  });
});
