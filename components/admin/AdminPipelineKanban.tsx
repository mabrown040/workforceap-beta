'use client';

import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import {
  PIPELINE_STAGE_COLORS,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGES_ORDERED,
  type PipelineStage,
} from '@/lib/pipeline/stage';

export type PipelineKanbanMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  enrolledProgram: string | null;
  placementRecord: {
    employerName: string;
    jobTitle: string;
    salaryOffered: number | null;
  } | null;
};

type ByStage = Record<PipelineStage, PipelineKanbanMember[]>;

function cloneByStage(input: ByStage): ByStage {
  const out = {} as ByStage;
  for (const stage of PIPELINE_STAGES_ORDERED) {
    out[stage] = input[stage] ? [...input[stage]] : [];
  }
  out.closed = input.closed ? [...input.closed] : [];
  return out;
}

function findMemberStage(by: ByStage, memberId: string): PipelineStage | null {
  for (const stage of PIPELINE_STAGES_ORDERED) {
    if (by[stage]?.some((m) => m.id === memberId)) return stage;
  }
  if (by.closed?.some((m) => m.id === memberId)) return 'closed';
  return null;
}

export default function AdminPipelineKanban({ initialByStage }: { initialByStage: ByStage }) {
  const [byStage, setByStage] = useState<ByStage>(() => cloneByStage(initialByStage));
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);

  const onDropOnColumn = useCallback(
    (e: React.DragEvent, targetStage: PipelineStage) => {
      e.preventDefault();
      setDragOverStage(null);
      const memberId = e.dataTransfer.getData('text/plain');
      if (!memberId) return;

      const from = findMemberStage(byStage, memberId);
      if (!from || from === targetStage) return;

      const member = byStage[from].find((m) => m.id === memberId);
      if (!member) return;

      const snapshot = cloneByStage(byStage);
      setByStage((prev) => {
        const next = cloneByStage(prev);
        next[from] = next[from].filter((m) => m.id !== memberId);
        next[targetStage] = [...next[targetStage], member];
        return next;
      });

      fetch(`/api/admin/members/${memberId}/pipeline-stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      }).then(async (res) => {
        if (!res.ok) {
          setByStage(snapshot);
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          window.alert(typeof j.error === 'string' ? j.error : 'Could not save column. Try again.');
        }
      });
    },
    [byStage]
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.75rem',
        alignItems: 'start',
      }}
    >
      {PIPELINE_STAGES_ORDERED.map((stage) => {
        const color = PIPELINE_STAGE_COLORS[stage];
        const stageStudents = byStage[stage] ?? [];
        const isOver = dragOverStage === stage;
        return (
          <div
            key={stage}
            className="portal-kanban-column"
            style={
              {
                minWidth: 0,
                '--portal-kanban-accent': color,
              } as CSSProperties
            }
          >
            <div className="portal-kanban-column__head">
              <span className="portal-kanban-column__title">{PIPELINE_STAGE_LABELS[stage]}</span>
              <span className="portal-kanban-column__count">{stageStudents.length}</span>
            </div>
            <div
              role="list"
              className={`portal-kanban-dropzone${isOver ? ' portal-kanban-dropzone--active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverStage(stage);
              }}
              onDrop={(e) => onDropOnColumn(e, stage)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {stageStudents.map((s) => (
                  <div
                    key={s.id}
                    role="listitem"
                    className="portal-kanban-card"
                    style={
                      {
                        '--portal-kanban-accent': color,
                        padding: '0.55rem 0.65rem',
                      } as CSSProperties
                    }
                    draggable
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverStage(stage);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDropOnColumn(e, stage);
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', s.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragOverStage(null)}
                  >
                    <Link
                      href={`/admin/members/${s.id}`}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.fullName}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--color-on-surface-variant)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '0.15rem',
                        }}
                      >
                        {s.email || s.phone || '—'}
                      </div>
                      {s.enrolledProgram && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-on-surface-variant)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '0.12rem',
                          }}
                        >
                          {s.enrolledProgram.replace(/-/g, ' ')}
                        </div>
                      )}
                      {stage === 'placed' && s.placementRecord && (
                        <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.12rem' }}>
                          {s.placementRecord.employerName}
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
