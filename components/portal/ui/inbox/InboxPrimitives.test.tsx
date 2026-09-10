import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { InboxRowButton, InboxRowLayout, InboxSearch } from './InboxPrimitives';

afterEach(cleanup);

it('renders each member subtitle once alongside the name, timestamp, and preview', () => {
  render(<InboxRowLayout title="Alex Member" subtitle="IT Support (IBM)" meta="Today" preview="Ready for a check-in" />);
  expect(screen.getAllByText('IT Support (IBM)')).toHaveLength(1);
  expect(screen.getByText('Alex Member')).toBeInTheDocument();
  expect(screen.getByText('Today')).toBeInTheDocument();
  expect(screen.getByText('Ready for a check-in')).toBeInTheDocument();
});

it('announces the selected conversation and names the search input', () => {
  render(<>
    <InboxRowButton active onClick={() => {}}>Alex Member</InboxRowButton>
    <InboxRowButton active={false} onClick={() => {}}>Jordan Member</InboxRowButton>
    <InboxSearch value="" onChange={() => {}} placeholder="Search by name or message…" />
  </>);
  expect(screen.getByRole('button', { name: 'Alex Member' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Jordan Member' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('searchbox', { name: 'Search by name or message…' })).toBeInTheDocument();
});
