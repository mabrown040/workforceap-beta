import type { SearchableItem, SearchSource } from '@astryxdesign/core/Typeahead';
import { globalSearchKey, type GlobalSearchResult, type GlobalSearchType } from './globalSearch';
import { normalizeDirectorySearch } from './directorySearch';

export type GlobalSearchItem = SearchableItem<{
  group: string;
  sublabel?: string;
  type?: GlobalSearchType;
  href: string;
}>;

const TYPE_GROUP: Record<GlobalSearchType, string> = {
  member: 'Members', staff: 'Staff', account: 'Accounts',
  employer: 'Employers', partner: 'Partners', job: 'Jobs',
};

const QUICK_LINKS: GlobalSearchItem[] = [
  ['members', 'Members'], ['users', 'Staff and accounts'], ['employers', 'Employers'],
  ['partners', 'Partners'], ['jobs', 'Jobs'],
].map(([path, label]) => ({
  id: `quick:${path}`,
  label,
  auxiliaryData: { group: 'Quick links', sublabel: `View ${label.toLowerCase()}`, href: `/admin/${path}` },
}));

/** Each search owns its error and navigation state; superseded work is ignored. */
export function createGlobalSearchSource(
  onError: (message: string | null) => void,
  fetchImpl: typeof fetch = fetch,
): SearchSource<GlobalSearchItem> & { resolveHref(id: string): string | undefined } {
  let version = 0;
  let controller: AbortController | null = null;
  let itemsById = new Map(QUICK_LINKS.map(item => [item.id, item]));
  const cancel = () => { version += 1; controller?.abort(); controller = null; };
  const bootstrap = () => {
    cancel();
    onError(null);
    itemsById = new Map(QUICK_LINKS.map(item => [item.id, item]));
    return QUICK_LINKS;
  };
  return {
    cancel,
    bootstrap,
    resolveHref: id => itemsById.get(id)?.auxiliaryData?.href,
    async search(query: string) {
      cancel();
      const q = normalizeDirectorySearch(query);
      if (q.length < 2) return bootstrap();
      const requestVersion = version;
      controller = new AbortController();
      onError(null);
      try {
        const response = await fetchImpl(`/api/admin/search?q=${encodeURIComponent(q)}&limit=8`, {
          credentials: 'include', signal: controller.signal,
        });
        if (requestVersion !== version) return [];
        if (!response.ok) {
          throw new Error(response.status === 401 ? 'Your session expired. Sign in again to search.'
            : response.status === 403 ? 'Search is unavailable for this account.'
              : 'Search is temporarily unavailable. Please try again.');
        }
        const data = await response.json() as { results?: GlobalSearchResult[] };
        if (requestVersion !== version) return [];
        if (!Array.isArray(data.results)) throw new Error('Search is temporarily unavailable. Please try again.');
        const items = data.results.map(result => ({
          id: globalSearchKey(result), label: result.label,
          auxiliaryData: { group: TYPE_GROUP[result.type], sublabel: result.sublabel, type: result.type, href: result.href },
        }));
        itemsById = new Map(items.map(item => [item.id, item]));
        return items;
      } catch (error) {
        if (requestVersion !== version) return [];
        itemsById.clear();
        onError(error instanceof Error && error.message.startsWith('Your session expired') ? error.message
          : error instanceof Error && error.message === 'Search is unavailable for this account.' ? error.message
            : 'Search is temporarily unavailable. Please try again.');
        return [];
      }
    },
  };
}
