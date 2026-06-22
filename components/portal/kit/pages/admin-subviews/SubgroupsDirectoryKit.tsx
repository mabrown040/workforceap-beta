'use client';

import { Users, Plus } from 'lucide-react';
import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  StatusTag,
  colorVar,
  type KpiItem,
} from '@/components/portal/kit';

/**
 * Subgroups directory — cohort / chapter / special-program card grid (dense).
 * Mockup: workforceap-admin-full.html "Subgroups" view.
 * Target route: /admin/subgroups
 *
 * Each card: a tinted people-icon tile, the subgroup name, and a description
 * line "{N} members · {focus}" (mockup examples: "48 members · Cloud & IT
 * focus"). A subtle status tag carries the subgroup type (Partner / Manager /
 * Church). The header subtitle stays "Cohorts, chapters & special programs"
 * per the mockup; real counts live in the KPI strip below it.
 *
 * Interactive (cards link to the legacy management view) → 'use client' so the
 * grid is hydration-safe alongside the kit primitives.
 */

export type SubgroupKind = 'partner' | 'manager' | 'church';

export interface SubgroupCard {
  id: string;
  name: string;
  /** Real member count for this subgroup (from MemberSubgroup groupBy). */
  members: number;
  /** Focus line — e.g. "Cloud & IT focus", a partner name, or the type. */
  focus: string;
  /** Subgroup type — drives a subtle status tag. */
  kind: SubgroupKind;
}

export interface SubgroupsDirectoryKitProps {
  subgroups?: SubgroupCard[];
  /** Total subgroup count (full directory, not just the loaded page). */
  totalSubgroups?: number;
  /** Total distinct member assignments across all subgroups (real aggregate). */
  totalMembers?: number;
}

const DEFAULT_SUBGROUPS: SubgroupCard[] = [
  { id: 'veterans', name: 'Veterans Cohort', members: 48, focus: 'Cloud & IT focus', kind: 'manager' },
  { id: 'healthcare-s26', name: 'Spring 2026 Healthcare', members: 62, focus: 'CNA track', kind: 'manager' },
  { id: 'youth-build', name: 'Youth Build (16–24)', members: 34, focus: 'trades', kind: 'church' },
];

/** Rotate the icon-tile tint across cards so the grid reads like the mockup. */
const TILE_TINTS: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--wa-surface-2, #fdf2f4)', fg: colorVar('accent') },
  { bg: 'rgba(43,123,185,0.12)', fg: colorVar('info') },
  { bg: 'rgba(46,125,50,0.12)', fg: colorVar('success') },
  { bg: 'rgba(164,127,56,0.14)', fg: colorVar('gold') },
];

const KIND_TAG: Record<SubgroupKind, { tone: 'info' | 'warn' | 'ok'; label: string }> = {
  partner: { tone: 'info', label: 'Partner' },
  manager: { tone: 'ok', label: 'Manager' },
  church: { tone: 'warn', label: 'Church' },
};

function SubgroupTile({ card, index }: { card: SubgroupCard; index: number }) {
  const tint = TILE_TINTS[index % TILE_TINTS.length];
  const tag = KIND_TAG[card.kind];
  return (
    <a
      href={`/admin/subgroups/${card.id}`}
      className="wa-kit-card wa-kit-card--hover wa-kit-focus"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: tint.bg,
            color: tint.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users className="h-5 w-5" />
        </div>
        <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
      </div>

      <div style={{ minWidth: 0 }}>
        <h3
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '-0.02em',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.name}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--wa-muted)', margin: '2px 0 0' }}>
          {card.members} {card.members === 1 ? 'member' : 'members'} · {card.focus}
        </p>
      </div>
    </a>
  );
}

export function SubgroupsDirectoryKit({
  subgroups = DEFAULT_SUBGROUPS,
  totalSubgroups,
  totalMembers,
}: SubgroupsDirectoryKitProps) {
  const groups = totalSubgroups ?? subgroups.length;
  const members = totalMembers ?? subgroups.reduce((sum, s) => sum + s.members, 0);
  const avgSize = groups > 0 ? Math.round(members / groups) : 0;
  const largest = subgroups.reduce((max, s) => Math.max(max, s.members), 0);

  const kpis: KpiItem[] = [
    { label: 'Subgroups', value: groups, color: 'text' },
    { label: 'Total Members', value: members, color: 'info' },
    { label: 'Avg Size', value: avgSize, color: 'success' },
    { label: 'Largest', value: largest, color: 'accent' },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Subgroups"
        kicker="People"
        goal="Cohorts, chapters & special programs"
        action={
          <a
            href="/admin/subgroups/new"
            className="wa-kit-focus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              background: 'var(--wa-accent)',
              color: '#fff',
            }}
          >
            <Plus className="h-4 w-4" /> New Subgroup
          </a>
        }
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} cols={4} />
      </div>

      {subgroups.length > 0 ? (
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-4">
          {subgroups.map((card, index) => (
            <SubgroupTile key={card.id} card={card} index={index} />
          ))}
        </div>
      ) : (
        <div
          className="wa-kit-card"
          style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--wa-muted)' }}
        >
          <Users className="h-6 w-6" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p style={{ fontWeight: 700, color: 'var(--wa-text)', margin: 0 }}>No subgroups yet</p>
          <p style={{ fontSize: 12, margin: '4px 0 0' }}>
            Create subgroups to give partners, managers, or churches visibility into their assigned
            members.
          </p>
        </div>
      )}
    </DesignSurface>
  );
}
