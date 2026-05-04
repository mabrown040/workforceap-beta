'use client';

import { useMemo, useState } from 'react';
import type { TemplateSample } from '@/app/admin/email-templates/page';

const CATEGORY_BADGES: Record<string, string> = {
  member: 'Member',
  employer: 'Employer',
  partner: 'Partner',
  admin: 'Admin',
};

type Props = {
  samples: TemplateSample[];
  categoryColors: Record<string, string>;
};

export default function EmailTemplatesClient({ samples, categoryColors }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const categories = useMemo(() => ['all', ...Array.from(new Set(samples.map((s) => s.category)))], [samples]);
  const filtered = filter === 'all' ? samples : samples.filter((s) => s.category === filter);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className="btn btn-outline btn-sm"
            style={filter === cat ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
          >
            {cat === 'all' ? 'All' : CATEGORY_BADGES[cat] ?? cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {filtered.map((sample) => (
          <article key={sample.cronId} style={{ border: '1px solid var(--outline-variant, rgba(0,0,0,.08))', borderRadius: '0.875rem', padding: '1rem', background: 'var(--surface-container)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{sample.subject}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{sample.cronName}</div>
              </div>
              <span style={{ color: categoryColors[sample.category] ?? 'inherit', fontWeight: 700 }}>
                {sample.category}
              </span>
            </div>
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View HTML</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.75rem', fontSize: '0.8125rem' }}>{sample.html}</pre>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
