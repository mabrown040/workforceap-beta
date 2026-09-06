import type { ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), params: 'ui=legacy', pathname: '/admin/users' }));
const router = { replace: navigation.replace, refresh: navigation.refresh };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.params),
}));

// Keep the actual managers, shared navigation hook, table, and row renderers.
// Replace unrelated UI primitives so these tests exercise the data contract.
vi.mock('@astryxdesign/core/TextInput', () => ({
  TextInput: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <label>{label}<input type="search" value={value} onChange={event => onChange(event.target.value)} /></label>
  ),
}));
vi.mock('@astryxdesign/core/Selector', () => ({
  Selector: ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) => (
    <label>{label}<select value={value} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
  ),
}));
vi.mock('@astryxdesign/core/Pagination', () => ({ Pagination: () => null }));
vi.mock('@astryxdesign/core/StatusDot', () => ({ StatusDot: () => null }));
vi.mock('@/lib/admin/studentStatus', () => ({ getStudentStatus: () => 'active' }));
vi.mock('@/components/admin/BulkEmailModal', () => ({ default: () => null }));
vi.mock('@/components/admin/BulkUpdateModal', () => ({ default: () => null }));
vi.mock('@/components/admin/ConfirmDialog', () => ({ default: () => null }));

import AdminUsersManager from '@/components/admin/AdminUsersManager';
import MembersTable from '@/components/admin/MembersTable';

const alice = {
  id: 'alice', fullName: 'Alice Example', email: 'alice@example.com', role: 'member',
  createdAt: '2026-09-01T12:00:00.000Z', memberHref: '/admin/members/alice',
};
const zelda = { ...alice, id: 'zelda', fullName: 'Zelda Example', email: 'zelda@example.com', memberHref: '/admin/members/zelda' };
const baseUsersProps: ComponentProps<typeof AdminUsersManager> = {
  initialUsers: [alice], canManageRoles: false, totalCount: 51, currentPage: 1, pageSize: 50,
};
const baseMembersProps: ComponentProps<typeof MembersTable> = {
  members: [], totalCount: 0, currentPage: 1, pageSize: 50, searchQuery: '',
  programFilter: '', statusFilter: '', partnerFilter: '', startDateFilter: '', endDateFilter: '',
  allPartnerOptions: [], allAssignablePrograms: [{ slug: 'it-support', title: 'IT Support' }],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  navigation.params = 'ui=legacy';
  navigation.pathname = '/admin/users';
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('full account manager server results', () => {
  it('replaces stale table and mobile rows when refreshed initialUsers arrive', () => {
    const { rerender } = render(<AdminUsersManager {...baseUsersProps} />);
    expect(within(screen.getByRole('table')).getByText('Alice Example')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Users mobile list' })).getByText('Alice Example')).toBeInTheDocument();

    rerender(<AdminUsersManager {...baseUsersProps} initialUsers={[zelda]} currentPage={2} />);
    expect(screen.queryByText('Alice Example')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Zelda Example')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Users mobile list' })).getByText('Zelda Example')).toBeInTheDocument();
  });

  it('keeps current rows while searching the full directory, then renders the returned page', () => {
    const { rerender } = render(<AdminUsersManager {...baseUsersProps} />);
    fireEvent.change(screen.getByLabelText('Search all accounts'), { target: { value: 'Zelda' } });
    expect(within(screen.getByRole('table')).getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Searching all accounts');
    expect(navigation.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    const destination = new URL(navigation.replace.mock.lastCall?.[0], 'http://localhost');
    expect(destination.searchParams.get('search')).toBe('Zelda');
    expect(destination.searchParams.get('ui')).toBe('legacy');

    navigation.params = destination.searchParams.toString();
    rerender(<AdminUsersManager {...baseUsersProps} initialUsers={[zelda]} totalCount={1} searchQuery="Zelda" />);
    expect(screen.queryByText('Alice Example')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Zelda Example')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 matching account');
  });

  it('does not hide server token matches that span a name and email', () => {
    const crossFieldMatch = { ...alice, fullName: 'Ada Byron', email: 'lovelace@example.com' };
    render(<AdminUsersManager {...baseUsersProps} initialUsers={[crossFieldMatch]} totalCount={1} searchQuery="Ada lovelace" />);
    expect(within(screen.getByRole('table')).getByText('Ada Byron')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Users mobile list' })).getByText('lovelace@example.com')).toBeInTheDocument();
  });

  it('clears filters using server navigation and prevents an old draft from firing afterward', () => {
    navigation.params = 'ui=legacy&search=Alice&role=member&page=2';
    render(<AdminUsersManager {...baseUsersProps} searchQuery="Alice" roleFilter="member" currentPage={2} />);
    fireEvent.change(screen.getByLabelText('Search all accounts'), { target: { value: 'Zelda' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search & filters' }));
    expect(screen.getByLabelText('Search all accounts')).toHaveValue('');
    const destination = new URL(navigation.replace.mock.lastCall?.[0], 'http://localhost');
    expect(destination.searchParams.toString()).toBe('ui=legacy');
    act(() => vi.advanceTimersByTime(1000));
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });
});

describe('member filter response synchronization', () => {
  it('does not reset a newer status choice when an earlier program response arrives', () => {
    navigation.pathname = '/admin/members';
    const { rerender } = render(<MembersTable {...baseMembersProps} />);
    fireEvent.change(screen.getByLabelText('Program'), { target: { value: 'it-support' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });
    expect(screen.getByLabelText('Status')).toHaveValue('active');

    navigation.params = 'ui=legacy&program=it-support';
    rerender(<MembersTable {...baseMembersProps} programFilter="it-support" />);
    expect(screen.getByLabelText('Program')).toHaveValue('it-support');
    expect(screen.getByLabelText('Status')).toHaveValue('active');

    navigation.params = 'ui=legacy&program=it-support&status=active';
    rerender(<MembersTable {...baseMembersProps} programFilter="it-support" statusFilter="active" />);
    expect(screen.getByLabelText('Status')).toHaveValue('active');
  });
});
