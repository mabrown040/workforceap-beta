'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandPalette, CommandPaletteInput } from '@astryxdesign/core/CommandPalette';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import type { SearchableItem, SearchSource } from '@astryxdesign/core/Typeahead';

type SearchResult = {
  id: string;
  type: 'member' | 'employer' | 'partner' | 'job';
  label: string;
  sublabel?: string;
  href: string;
  icon: string;
};

const TYPE_GROUP: Record<SearchResult['type'], string> = {
  member: 'Members',
  employer: 'Employers',
  partner: 'Partners',
  job: 'Jobs',
};

type PaletteItem = SearchableItem<{
  group: string;
  sublabel?: string;
  type?: SearchResult['type'];
}>;

// Bootstrap quick links shown before the user types.
const QUICK_LINKS: PaletteItem[] = [
  { id: '/admin/members', label: 'Members', auxiliaryData: { group: 'Quick links', sublabel: 'View all members' } },
  { id: '/admin/employers', label: 'Employers', auxiliaryData: { group: 'Quick links', sublabel: 'View all employers' } },
  { id: '/admin/partners', label: 'Partners', auxiliaryData: { group: 'Quick links', sublabel: 'View all partners' } },
  { id: '/admin/jobs', label: 'Jobs', auxiliaryData: { group: 'Quick links', sublabel: 'View all jobs' } },
];

/**
 * Admin global search (⌘K) — Astryx `CommandPalette` over the existing
 * `/api/admin/search` endpoint. Item ids are the target hrefs, so selection
 * (`onValueChange`) is a straight router.push. Replaces the previous
 * hand-rolled fixed-overlay implementation (focus trap, listbox semantics,
 * grouping, and keyboard navigation now come from the component).
 */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open (Escape is handled by the palette's own dialog)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const searchSource = useMemo<SearchSource<PaletteItem>>(
    () => ({
      async search(query: string) {
        if (query.trim().length < 2) return QUICK_LINKS;
        try {
          const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}&limit=8`, { credentials: 'include' });
          if (!res.ok) return [];
          const data = (await res.json()) as { results: SearchResult[] };
          return (data.results ?? []).map((r) => ({
            id: r.href,
            label: r.label,
            auxiliaryData: { group: TYPE_GROUP[r.type], sublabel: r.sublabel, type: r.type },
          }));
        } catch {
          return [];
        }
      },
      bootstrap() {
        return QUICK_LINKS;
      },
    }),
    []
  );

  return (
    <>
      <button
        type="button"
        className="portal-icon-btn"
        onClick={() => setOpen(true)}
        aria-label="Global search (⌘K)"
        title="Search (⌘K)"
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>search</span>
        <span className="wa-hidden md:wa-inline">Search</span>
        <kbd style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '0.25rem', background: 'var(--surface-container-high)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--outline-variant)', display: 'inline-block' }}>⌘K</kbd>
      </button>
      <CommandPalette<PaletteItem>
        isOpen={open}
        onOpenChange={setOpen}
        searchSource={searchSource}
        label="Global search"
        input={<CommandPaletteInput placeholder="Search members, employers, partners, jobs…" />}
        emptyBootstrapText="Type to search members, employers, partners, and jobs"
        emptySearchText="No results"
        onValueChange={(href) => {
          setOpen(false);
          router.push(href);
        }}
        renderItem={(item) => (
          <>
            <span style={{ flex: 1, minWidth: 0 }}>
              <Text type="body" maxLines={1}>
                {item.label}
              </Text>
              {item.auxiliaryData?.sublabel ? (
                <Text type="supporting" size="sm" maxLines={1}>
                  {item.auxiliaryData.sublabel}
                </Text>
              ) : null}
            </span>
            {item.auxiliaryData?.type ? <Badge label={item.auxiliaryData.type} /> : null}
          </>
        )}
      />
    </>
  );
}
