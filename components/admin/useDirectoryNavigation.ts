'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { normalizeDirectorySearch } from '@/lib/admin/directorySearch';

/** Keep the search draft responsive while results always come from the server. */
export function useDirectoryNavigation(searchQuery: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchQuery);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedQuery = useRef<string | null>(null);
  const paramsString = searchParams?.toString() ?? '';
  const currentParams = useRef(paramsString);
  const requestedParams = useRef<string | null>(null);

  useEffect(() => {
    // Transition renders and older responses must not undo optimistic filters
    // that a later navigation still needs to carry forward.
    if (requestedParams.current === null || requestedParams.current === paramsString) {
      currentParams.current = paramsString;
      requestedParams.current = null;
    }
  }, [paramsString]);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    // A response to an earlier query must not replace a newer draft.
    if (requestedQuery.current === null || requestedQuery.current === searchQuery) {
      requestedQuery.current = null;
      setQuery(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    const onBack = () => {
      cancelTimer();
      requestedQuery.current = null;
      requestedParams.current = null;
      currentParams.current = new URLSearchParams(window.location.search).toString();
      setQuery(normalizeDirectorySearch(new URLSearchParams(window.location.search).get('search') ?? ''));
    };
    window.addEventListener('popstate', onBack);
    return () => { cancelTimer(); window.removeEventListener('popstate', onBack); };
  }, [cancelTimer]);

  const navigate = useCallback((changes: Record<string, string>) => {
    cancelTimer();
    const params = new URLSearchParams(currentParams.current);
    // Selecting a filter while a search is debouncing preserves both changes.
    if (requestedQuery.current !== null) {
      if (requestedQuery.current) params.set('search', requestedQuery.current);
      else params.delete('search');
    }
    Object.entries(changes).forEach(([key, value]) => {
      const normalized = key === 'search' ? normalizeDirectorySearch(value) : value;
      if (normalized) params.set(key, normalized);
      else params.delete(key);
    });
    if (Object.keys(changes).some(key => key !== 'page')) params.delete('page');
    if ('search' in changes) {
      requestedQuery.current = normalizeDirectorySearch(changes.search);
      setQuery(requestedQuery.current);
    }
    currentParams.current = params.toString();
    requestedParams.current = currentParams.current;
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }, [cancelTimer, pathname, router]);

  const search = useCallback((value: string) => {
    cancelTimer();
    setQuery(value);
    const normalized = normalizeDirectorySearch(value);
    requestedQuery.current = normalized;
    timer.current = setTimeout(() => navigate({ search: normalized }), 300);
  }, [cancelTimer, navigate]);

  return { query, search, navigate, pending: pending || normalizeDirectorySearch(query) !== searchQuery };
}
