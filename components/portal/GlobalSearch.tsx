'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  id: string;
  type: 'member' | 'employer' | 'partner' | 'job';
  label: string;
  sublabel?: string;
  href: string;
  icon: string;
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(''); setResults([]); setSelectedIndex(0); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}&limit=8`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { results: SearchResult[] };
        setResults(data.results ?? []);
        setSelectedIndex(0);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void search(query); }, 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(results[selectedIndex].href);
      setOpen(false);
    }
  };

  const TYPE_COLOR: Record<string, string> = {
    member: 'var(--color-accent)',
    employer: 'var(--color-blue, #2b7bb9)',
    partner: 'var(--color-gold)',
    job: 'var(--color-green, #4a9b4f)',
  };

  if (!open) return (
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
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{ width: '100%', maxWidth: '560px', margin: '0 1rem', borderRadius: '1rem', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search members, employers, partners, jobs…"
            className="global-search-input"
            style={{ flex: 1, background: 'none', border: 'none', fontSize: '1rem', color: 'var(--color-on-surface)', fontFamily: 'inherit' }}
          />
          {loading && <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', animation: 'spin 1s linear infinite' }}>progress_activity</span>}
          <kbd onClick={() => setOpen(false)} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--outline-variant)', cursor: 'pointer' }}>Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: '0.375rem 0', maxHeight: '360px', overflowY: 'auto' }}>
            {results.map((r, i) => (
              <li key={`${r.type}-${r.id}`}>
                <a
                  href={r.href}
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: 'inherit', background: i === selectedIndex ? 'var(--surface-container)' : 'transparent', transition: 'background 0.15s' }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: `color-mix(in srgb, ${TYPE_COLOR[r.type]} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: TYPE_COLOR[r.type], fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</p>
                    {r.sublabel && <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sublabel}</p>}
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '9999px', background: `color-mix(in srgb, ${TYPE_COLOR[r.type]} 10%, transparent)`, color: TYPE_COLOR[r.type], textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
                    {r.type}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : query.trim().length >= 2 && !loading ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.5rem', opacity: 0.6 }}>search_off</span>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : query.trim().length === 0 ? (
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {[
              { label: 'Members', href: '/admin/members', icon: 'groups', desc: 'View all members' },
              { label: 'Employers', href: '/admin/employers', icon: 'business', desc: 'View all employers' },
              { label: 'Partners', href: '/admin/partners', icon: 'handshake', desc: 'View all partners' },
              { label: 'Jobs', href: '/admin/jobs', icon: 'work', desc: 'View all jobs' },
            ].map(s => (
              <a key={s.href} href={s.href} onClick={() => setOpen(false)}
                className="portal-notification-item"
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', transition: 'background 0.15s' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <span style={{ fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: 'auto' }}>{s.desc}</span>
              </a>
            ))}
          </div>
        ) : null}

        <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>
          <span><kbd style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>↵</kbd> open</span>
          <span><kbd style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
