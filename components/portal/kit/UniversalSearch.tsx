'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface UniversalSearchProps {
  placeholder?: string;
  onSearch?: (q: string) => void;
  /** Show the ⌘K hint chip (desktop). */
  hint?: boolean;
}

/**
 * Universal search / command bar. The "finding is simple" surface.
 * Mockup: design-system header search.
 */
export function UniversalSearch({ placeholder = 'Find anything…', onSearch, hint = true }: UniversalSearchProps) {
  const [q, setQ] = useState('');
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
      <Search size={15} aria-hidden="true" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--wa-muted)', pointerEvents: 'none' }} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch?.(q); }}
        placeholder={placeholder}
        aria-label="Universal search"
        className="wa-kit-focus"
        style={{
          width: '100%',
          border: '1px solid var(--wa-border)',
          background: 'var(--wa-bg)',
          borderRadius: 999,
          padding: '10px 14px 10px 38px',
          fontSize: 13,
          outline: 'none',
          color: 'var(--wa-text)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      />
      {hint ? (
        <span className="wa-hidden md:wa-inline" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 700, color: 'var(--wa-muted)', border: '1px solid var(--wa-border)', borderRadius: 5, padding: '2px 5px' }}>
          ⌘K
        </span>
      ) : null}
    </div>
  );
}
