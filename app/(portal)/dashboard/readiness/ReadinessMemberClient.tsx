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
    valueText?: string;
  }>;
};

export default function ReadinessMemberClient() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/member/readiness')
      .then((r) => r.json())
      .then((d) => {
        setSections(d.sections ?? []);
        setExpanded(d.sections?.reduce((acc: Record<number, boolean>, s: Section) => ({ ...acc, [s.section]: true }), {}) ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = sections.reduce((acc, s) => acc + s.items.filter((i) => i.completed).length, 0);
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) return <ReadinessSkeleton />;

  return (
    <div className="readiness-member-content">
      <div className="readiness-member-progress">
        <div className="readiness-progress-track">
          <div className="readiness-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="readiness-progress-text">Progress: {pct}%</p>
        <p className="readiness-progress-desc">
          {completedItems} of {totalItems} items complete. Your counselor updates this as you progress.
        </p>
      </div>

      <div className="readiness-sections">
        {sections.map((sec) => (
          <div key={sec.section} className="readiness-section-card">
            <button
              type="button"
              className="readiness-section-header"
              onClick={() => setExpanded((e) => ({ ...e, [sec.section]: !e[sec.section] }))}
            >
              <span>{expanded[sec.section] !== false ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</span>
              <span>Section {sec.section} — {sec.title}</span>
            </button>
            {expanded[sec.section] !== false && (
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
