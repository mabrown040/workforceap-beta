'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, MessageSquare, Printer } from 'lucide-react';
import { ReadinessSkeleton } from '@/components/ui/Skeleton';

type Section = {
  section: number;
  title: string;
  items: Array<{
    key: string;
    label: string;
    type: 'checkbox' | 'text' | 'textarea';
    placeholder?: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
    valueText?: string;
  }>;
};

type Props = { memberId: string; memberName: string; programName: string };

export default function ReadinessCounselorClient({ memberId, memberName, programName }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => ({}));
  const [pendingValues, setPendingValues] = useState<Record<string, string>>({});
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/readiness`)
      .then((r) => r.json())
      .then((d) => {
        setSections(d.sections ?? []);
        setLastUpdatedBy(d.lastUpdatedBy ?? null);
        setLastUpdated(d.lastUpdatedAt ?? null);
        setExpanded((d.sections ?? []).reduce((acc: Record<number, boolean>, s: Section) => ({ ...acc, [s.section]: true }), {}));
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const updateItem = async (itemKey: string, data: { completed?: boolean; valueText?: string; notes?: string }) => {
    setSaving(itemKey);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/readiness`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, ...data }),
      });
      if (res.ok) {
        const json = await res.json();
        setSections((prev) =>
          prev.map((sec) => ({
            ...sec,
            items: sec.items.map((i) =>
              i.key === itemKey
                ? {
                    ...i,
                    completed: data.completed ?? i.completed,
                    valueText: data.valueText !== undefined ? data.valueText : i.valueText,
                    notes: data.notes !== undefined ? data.notes : i.notes,
                  }
                : i
            ),
          }))
        );
        setLastUpdated(new Date().toISOString());
        if (json.counselorName) setLastUpdatedBy(json.counselorName);
      }
    } finally {
      setSaving(null);
    }
  };

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = sections.reduce((acc, s) => acc + s.items.filter((i) => i.completed).length, 0);
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) return <ReadinessSkeleton />;

  const secComplete = (sec: Section) => sec.items.filter((i) => i.completed).length;
  const secTotal = (sec: Section) => sec.items.length;

  return (
    <div className="readiness-counselor-content" id="readiness-print-area">
      <div className="readiness-print-only" aria-hidden="true">
        <p><strong>Member:</strong> {memberName}</p>
        <p><strong>Program:</strong> {programName}</p>
        <p><strong>Date printed:</strong> {new Date().toLocaleDateString()}</p>
      </div>
      <div className="readiness-counselor-progress-bar">
        <div className="readiness-progress-track">
          <div className="readiness-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="readiness-progress-text">
          Progress: {completedItems}/{totalItems} items ({pct}%)
        </p>
        {lastUpdated && (
          <p className="readiness-last-updated">
            Last updated by {lastUpdatedBy ?? 'counselor'} on {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      <div className="readiness-print-actions">
        <button type="button" className="btn btn-outline" onClick={() => window.print()}>
          <Printer size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
          Print Checklist
        </button>
      </div>

      <div className="readiness-sections">
        {sections.map((sec) => (
          <div key={sec.section} className="readiness-section-card">
            <button
              type="button"
              className="readiness-section-header"
              onClick={() => setExpanded((e) => ({ ...e, [sec.section]: !e[sec.section] }))}
            >
              <span>{expanded[sec.section] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</span>
              <span>Section {sec.section} — {sec.title}</span>
              <span className="readiness-section-count">{secComplete(sec)}/{secTotal(sec)} complete</span>
            </button>
            {expanded[sec.section] !== false && (
              <div className="readiness-section-body">
                {sec.items.map((item) => (
                  <div key={item.key} className="readiness-item-row">
                    {item.type === 'checkbox' ? (
                      <label className="readiness-checkbox-label">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => updateItem(item.key, { completed: e.target.checked })}
                          disabled={!!saving}
                        />
                        <span className="readiness-item-label">{item.label}</span>
                        {item.completed && (
                          <span className="readiness-item-completed">
                            <CheckCircle size={16} />
                          </span>
                        )}
                      </label>
                    ) : item.type === 'text' ? (
                      <div className="readiness-text-field">
                        <label>{item.label}</label>
                        <input
                          type="text"
                          value={pendingValues[item.key] ?? item.valueText ?? ''}
                          onChange={(e) => setPendingValues((p) => ({ ...p, [item.key]: e.target.value }))}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (item.valueText ?? '')) updateItem(item.key, { valueText: v });
                          }}
                          placeholder={item.placeholder}
                        />
                      </div>
                    ) : (
                      <div className="readiness-text-field">
                        <label>{item.label}</label>
                        <textarea
                          value={pendingValues[item.key] ?? item.valueText ?? ''}
                          onChange={(e) => setPendingValues((p) => ({ ...p, [item.key]: e.target.value }))}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (item.valueText ?? '')) updateItem(item.key, { valueText: v });
                          }}
                          placeholder={item.placeholder}
                          rows={3}
                        />
                      </div>
                    )}
                    <div className="readiness-notes-trigger">
                      <button
                        type="button"
                        className="readiness-notes-btn"
                        onClick={() => setNotesOpen((o) => ({ ...o, [item.key]: !o[item.key] }))}
                      >
                        <MessageSquare size={16} />
                        Notes
                      </button>
                      {notesOpen[item.key] && (
                        <textarea
                          className="readiness-notes-input"
                          value={pendingValues[`${item.key}_notes`] ?? item.notes ?? ''}
                          onChange={(e) => setPendingValues((p) => ({ ...p, [`${item.key}_notes`]: e.target.value }))}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (item.notes ?? '')) updateItem(item.key, { notes: v });
                          }}
                          placeholder="Internal notes…"
                          rows={2}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="readiness-signature-block">
        <p>_________________________________ &nbsp; ___________</p>
        <p>Client Signature &nbsp; Date</p>
        <p style={{ marginTop: '1rem' }}>_________________________________ &nbsp; ___________</p>
        <p>Counselor Signature &nbsp; Date</p>
      </div>
    </div>
  );
}
