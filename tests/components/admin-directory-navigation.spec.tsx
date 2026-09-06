import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  params: '',
  pathname: '/admin/members',
}));
const router = { replace: navigation.replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.params),
}));

import { useDirectoryNavigation } from '@/components/admin/useDirectoryNavigation';

function renderDirectory(searchQuery = '', params = 'ui=kit&page=4') {
  navigation.params = params;
  return renderHook(({ searchQuery }) => useDirectoryNavigation(searchQuery), {
    initialProps: { searchQuery },
  });
}

function lastNavigationParams(): URLSearchParams {
  const destination = navigation.replace.mock.lastCall?.[0] as string;
  return new URL(destination, 'http://localhost').searchParams;
}

describe('server-backed admin directory navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    navigation.params = '';
    navigation.pathname = '/admin/members';
    window.history.replaceState({}, '', '/admin/members');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('keeps typing responsive and debounces only the latest query into a server navigation', () => {
    const { result } = renderDirectory();
    act(() => result.current.search('Ada'));
    expect(result.current.query).toBe('Ada');
    expect(result.current.pending).toBe(true);
    act(() => vi.advanceTimersByTime(150));
    act(() => result.current.search('Ada  Lovelace '));
    act(() => vi.advanceTimersByTime(299));
    expect(navigation.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace.mock.lastCall?.[1]).toEqual({ scroll: false });
    expect(lastNavigationParams().get('search')).toBe('Ada Lovelace');
    expect(lastNavigationParams().get('ui')).toBe('kit');
    expect(lastNavigationParams().has('page')).toBe(false);
  });

  it('does not replace a newer draft with an older server response', () => {
    const { result, rerender } = renderDirectory();
    act(() => result.current.search('Al'));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.search('Alice'));

    navigation.params = 'ui=kit&search=Al';
    rerender({ searchQuery: 'Al' });
    expect(result.current.query).toBe('Alice');
    expect(result.current.pending).toBe(true);
    act(() => vi.advanceTimersByTime(300));
    expect(lastNavigationParams().get('search')).toBe('Alice');

    navigation.params = 'ui=kit&search=Alice';
    rerender({ searchQuery: 'Alice' });
    expect(result.current.query).toBe('Alice');
    expect(result.current.pending).toBe(false);
  });

  it('clearing search immediately cancels the stale debounce and preserves the other filters', () => {
    const { result } = renderDirectory('Jane', 'search=Jane&role=member&ui=kit&page=3');
    act(() => result.current.search('Alexander'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.navigate({ search: '' }));
    expect(result.current.query).toBe('');
    expect(lastNavigationParams().has('search')).toBe(false);
    expect(lastNavigationParams().get('role')).toBe('member');
    expect(lastNavigationParams().get('ui')).toBe('kit');
    expect(lastNavigationParams().has('page')).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it('merges a filter change with the pending search draft and resets pagination', () => {
    const { result } = renderDirectory('', 'ui=kit&page=9&status=active');
    act(() => result.current.search('Ada Lovelace'));
    act(() => result.current.navigate({ role: 'member' }));
    expect(lastNavigationParams().get('search')).toBe('Ada Lovelace');
    expect(lastNavigationParams().get('role')).toBe('member');
    expect(lastNavigationParams().get('status')).toBe('active');
    expect(lastNavigationParams().get('ui')).toBe('kit');
    expect(lastNavigationParams().has('page')).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it('carries successive filters through transition renders before the server responds', () => {
    const { result } = renderDirectory('Ada', 'search=Ada&ui=kit&page=4');
    act(() => result.current.navigate({ role: 'member' }));
    act(() => result.current.navigate({ program: 'it-support' }));
    expect(navigation.replace).toHaveBeenCalledTimes(2);
    expect(lastNavigationParams().get('role')).toBe('member');
    expect(lastNavigationParams().get('program')).toBe('it-support');
    expect(lastNavigationParams().get('search')).toBe('Ada');
    expect(lastNavigationParams().get('ui')).toBe('kit');
  });

  it('does not lose a newer filter when an earlier filter response reaches the hook', () => {
    const { result, rerender } = renderDirectory('Ada', 'search=Ada&ui=kit');
    act(() => result.current.navigate({ role: 'member' }));
    const earlierParams = lastNavigationParams().toString();
    act(() => result.current.navigate({ program: 'it-support' }));

    navigation.params = earlierParams;
    rerender({ searchQuery: 'Ada' });
    act(() => result.current.navigate({ status: 'active' }));
    expect(lastNavigationParams().get('role')).toBe('member');
    expect(lastNavigationParams().get('program')).toBe('it-support');
    expect(lastNavigationParams().get('status')).toBe('active');
  });

  it('cancels the debounce on unmount', () => {
    const { result, unmount } = renderDirectory();
    act(() => result.current.search('Ada'));
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('synchronizes browser back and forward navigation and cancels an unsent draft', () => {
    const { result, rerender } = renderDirectory('Alice', 'search=Alice&ui=kit');
    act(() => result.current.search('Unsent draft'));
    act(() => {
      window.history.replaceState({}, '', '/admin/members?search=Bob&role=partner&ui=kit&page=4');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.query).toBe('Bob');
    act(() => vi.advanceTimersByTime(1000));
    expect(navigation.replace).not.toHaveBeenCalled();

    navigation.params = 'search=Bob&role=partner&ui=kit&page=4';
    rerender({ searchQuery: 'Bob' });
    expect(result.current.pending).toBe(false);
    act(() => result.current.navigate({ program: 'it-support' }));
    expect(lastNavigationParams().get('search')).toBe('Bob');
    expect(lastNavigationParams().get('role')).toBe('partner');
    expect(lastNavigationParams().get('ui')).toBe('kit');
    expect(lastNavigationParams().has('page')).toBe(false);

    act(() => {
      window.history.replaceState({}, '', '/admin/members?search=Alice&ui=kit');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.query).toBe('Alice');
    navigation.params = 'search=Alice&ui=kit';
    rerender({ searchQuery: 'Alice' });
    expect(result.current.pending).toBe(false);
  });

  it('uses server normalization so oversized or NUL-containing input can finish loading', () => {
    const normalized = 'a'.repeat(200);
    const { result, rerender } = renderDirectory();
    act(() => result.current.search(`\0 ${'a'.repeat(250)} \0`));
    act(() => vi.advanceTimersByTime(300));
    expect(lastNavigationParams().get('search')).toBe(normalized);
    navigation.params = lastNavigationParams().toString();
    rerender({ searchQuery: normalized });
    expect(result.current.query).toBe(normalized);
    expect(result.current.pending).toBe(false);
  });
});
