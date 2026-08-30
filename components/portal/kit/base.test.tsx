import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { StatusTag } from './StatusTag';
import { StatTile } from './StatTile';
import { cx } from './base';

import { JobListingRow } from './JobListingRow';
import { QueueRow } from './QueueRow';

describe('KitBaseProps contract', () => {
  it('cx joins truthy classes in order (consumer last)', () => {
    expect(cx('a', undefined, 'b', false, 'consumer')).toBe('a b consumer');
  });

  it('StatusTag passes through className, style, ref, and data-*', () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <StatusTag tone="ok" className="wa-ml-2" style={{ marginTop: 4 }} ref={ref} data-testid="tag">
        Active
      </StatusTag>
    );
    const el = screen.getByTestId('tag');
    expect(ref.current).toBe(el);
    expect(el.className).toContain('wa-kit-tag');
    expect(el.className).toContain('wa-kit-tag--ok');
    expect(el.className).toContain('wa-ml-2');
    expect(el.style.marginTop).toBe('4px');
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('StatTile keeps consumer className on the outer wrapper', () => {
    render(<StatTile label="Members" value={42} data-testid="tile" className="custom" />);
    const el = screen.getByTestId('tile');
    expect(el.className).toBe('custom');
  });

  it('JobListingRow passes through className, style, ref, and data-*', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <JobListingRow
        href="/dashboard/jobs/j1"
        title="Cloud Support Engineer"
        meta="Deloitte · Austin, TX"
        match="92% match"
        applied
        first
        className="wa-ml-2"
        style={{ marginTop: 4 }}
        ref={ref}
        data-testid="job-row"
      />,
    );
    const el = screen.getByTestId('job-row');
    expect(ref.current).toBe(el);
    expect(el.className).toContain('wa-kit-focus');
    expect(el.className).toContain('wa-ml-2');
    expect(el.style.marginTop).toBe('4px');
    expect(screen.getByText('Cloud Support Engineer')).toBeTruthy();
    expect(screen.getByText('92% match')).toBeTruthy();
    expect(screen.getByText('Applied')).toBeTruthy();
  });

  it('QueueRow exposes responsive copy and action hooks', () => {
    render(
      <QueueRow
        tone="red"
        title="5 students inactive 14+ days"
        meta="Cloud & IT cohort"
        action={<button type="button">Assign outreach</button>}
      />,
    );

    expect(screen.getByText('5 students inactive 14+ days').closest('.wa-kit-queue-row__copy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign outreach' }).parentElement).toHaveClass(
      'wa-kit-queue-row__action',
    );
    expect(screen.getByRole('button', { name: 'Assign outreach' }).closest('.wa-kit-queue-row')).toBeTruthy();
  });
});
