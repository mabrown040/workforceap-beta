'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { ReadinessSkeleton } from '@/components/ui/Skeleton';

type Section = {
  section: number;
  title: string;
  items: Array<{
    key: string;
    label: string;
    type: string;
    completed: boolean;
    valueText?: string | null;
  }>;
};

function buildExpanded(sections: Section[]): Record<number, boolean> {
  return sections.reduce<Record<number, boolean>>((acc, s) => {
    acc[s.section] = true;
    return acc;
  }, {});
}

type ReadinessMemberClientProps = {
  /** Server-rendered checklist (live DB + template). Prefer this over client-only fetch. */
  initialSections?: Section[];
  /** Set when the server could not load checklist rows */
  loadError?: string | null;
};

export default function ReadinessMemberClient({
  initialSections = [],
  loadError = null,
}: ReadinessMemberClientProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [error, setError] = useState<string | null>(loadError);
  const [loading, setLoading] = useState(
    () => initialSections.length === 0 && loadError == null
  );

  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>(() =>
    initialSections.length ? buildExpanded(initialSections) : {}
  );

  useEffect(() => {
    if (initialSections.length > 0 || loadError != null) return;

    let cancelled = false;
    fetch('/api/member/readiness')
      .then(async (r) => {
        const data = (await r.json()) as { sections?: Section[]; error?: string };
        if (!r.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load readiness checklist');
        }
        return data;
      })
      .then((d) => {
        if (cancelled) return;
        const next = d.sections ?? [];
        setSections(next);
        setExpandedMap(buildExpanded(next));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load readiness checklist');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialSections.length, loadError]);

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = sections.reduce((acc, s) => acc + s.items.filter((i) => i.completed).length, 0);
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) return <ReadinessSkeleton />;

  if (error) {
    return (
      <div className="readiness-member-content" role="alert" style={{ padding: '1rem 0' }}>
        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>{error}</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }

  return (
    <div className="readiness-member-content">
      <div className="readiness-member-progress">
        <div className="readiness-progress-track">
          <div className="readiness-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="readiness-progress-text">Counselor checklist: {pct}%</p>
        <p className="readiness-progress-desc">
          {completedItems} of {totalItems} milestones advisor-verified. Your auto-calculated readiness score is shown above and updates from your activity.
        </p>
      </div>

      <div className="readiness-sections">
        {sections.map((sec) => (
          <div key={sec.section} className="readiness-section-card">
            <button
              type="button"
              className="readiness-section-header"
              onClick={() => setExpandedMap((e) => ({ ...e, [sec.section]: !e[sec.section] }))}
            >
              <span>{expandedMap[sec.section] !== false ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</span>
              <span>Section {sec.section} — {sec.title}</span>
            </button>
            {expandedMap[sec.section] !== false && (
              <div className="readiness-section-body">
                {sec.items.map((item) => (
                  <div key={item.key} className="readiness-member-item">
                    <span className="readiness-member-icon">
                      {item.completed ? <CheckCircle size={20} className="readiness-icon-done" /> : <span className="readiness-icon-empty" />}
                    </span>
                    <div>
                      <span>{item.label}</span>
                      {item.valueText && (
                        <p className="readiness-member-value">{item.valueText}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
