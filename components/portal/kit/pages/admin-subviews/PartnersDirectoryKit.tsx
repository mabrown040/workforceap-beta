import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Handshake, Building2, HeartHandshake, Users, Plus } from 'lucide-react';
import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  StatusTag,
  colorVar,
  type KpiItem,
  type KitColor,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Partners directory — responsive card grid of partner orgs (workforce centers,
 * nonprofits, referral orgs). Mockup: workforceap-admin-full.html "partners"
 * view: a 1/2/3-col card grid where each card is an icon tile, the partner
 * name, a "{N} referrals · {N} placed" line, and a footer row of status + a
 * green "{X}% placement". Topped with a KPI strip of real aggregates.
 * Target route: /admin/partners (DEFAULT render).
 *
 * Pure presentational + a couple of <Link> CTAs — no client state, so this
 * stays a server component (no 'use client').
 */
export interface PartnerCard {
  id: string;
  name: string;
  /** Stable slug used for the manage link. */
  slug: string;
  referrals: number;
  placed: number;
  /** True when active && status === 'active'. */
  active: boolean;
  /** Raw partner.status (active, pending_approval, inactive, rejected). */
  status: string;
}

export interface PartnersDirectoryKitProps {
  partners?: PartnerCard[];
  /** Total partner count (may exceed the rendered page). */
  total?: number;
}

/** Demo data so the kit renders standalone (matches the mockup numbers). */
const DEFAULT_PARTNERS: PartnerCard[] = [
  { id: '1', name: 'Austin Workforce Board', slug: 'austin-workforce-board', referrals: 142, placed: 38, active: true, status: 'active' },
  { id: '2', name: 'Goodwill Central TX', slug: 'goodwill-central-tx', referrals: 88, placed: 21, active: true, status: 'active' },
  { id: '3', name: 'Veterans Resource Center', slug: 'veterans-resource-center', referrals: 54, placed: 19, active: true, status: 'active' },
];

/** Placement rate (placed / referrals) as a whole percent; 0 when no referrals. */
function placementPct(p: { referrals: number; placed: number }): number {
  if (p.referrals <= 0) return 0;
  return Math.round((p.placed / p.referrals) * 100);
}

/** Status → tag tone + label. */
function statusTag(p: PartnerCard): { tone: KitTone; label: string } {
  if (p.status === 'pending_approval') return { tone: 'warn', label: 'Pending' };
  if (p.status === 'rejected') return { tone: 'alert', label: 'Rejected' };
  if (p.active) return { tone: 'muted', label: 'Active' };
  return { tone: 'muted', label: 'Inactive' };
}

/**
 * Deterministically vary the icon-tile accent across cards so the grid reads
 * like the mockup (crimson / green / info) rather than a wall of one color.
 */
const TILE_PALETTE: { color: KitColor; bg: string }[] = [
  { color: 'accent', bg: 'rgba(173, 44, 77, 0.10)' },
  { color: 'success', bg: 'rgba(74, 155, 79, 0.10)' },
  { color: 'info', bg: 'rgba(43, 123, 185, 0.10)' },
  { color: 'gold', bg: 'rgba(164, 127, 56, 0.12)' },
];

const TILE_ICONS = [Building2, HeartHandshake, Users, Handshake];

const addPartnerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  background: 'var(--wa-accent)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  textDecoration: 'none',
};

export function PartnersDirectoryKit({
  partners = DEFAULT_PARTNERS,
  total,
}: PartnersDirectoryKitProps) {
  const count = total ?? partners.length;
  const totalReferrals = partners.reduce((sum, p) => sum + p.referrals, 0);
  const totalPlaced = partners.reduce((sum, p) => sum + p.placed, 0);
  const avgPlacement = totalReferrals > 0 ? Math.round((totalPlaced / totalReferrals) * 100) : 0;

  const kpis: KpiItem[] = [
    { label: 'Partners', value: count },
    { label: 'Referrals', value: totalReferrals.toLocaleString() },
    { label: 'Placed', value: totalPlaced.toLocaleString(), color: 'success' },
    { label: 'Avg placement rate', value: `${avgPlacement}%`, color: 'success' },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Partners"
        goal="Workforce centers, nonprofits, referral orgs"
        action={
          <Link href="/admin/partners/new" style={addPartnerStyle} className="wa-kit-focus">
            <Plus className="h-4 w-4" aria-hidden /> Add Partner
          </Link>
        }
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} cols={4} />
      </div>

      {partners.length === 0 ? (
        <div className="wa-kit-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h3 style={{ fontWeight: 800, fontSize: 16 }}>No partner organizations yet</h3>
          <p style={{ fontSize: 13, color: 'var(--wa-muted)', margin: '8px auto 16px', maxWidth: 460 }}>
            Partner organizations refer candidates to WorkforceAP. Each partner gets their own portal
            login, referral tracking, and milestone notifications for their members.
          </p>
          <Link href="/admin/partners/new" style={addPartnerStyle} className="wa-kit-focus">
            <Plus className="h-4 w-4" aria-hidden /> Add Partner
          </Link>
        </div>
      ) : (
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-4">
          {partners.map((p, i) => {
            const tile = TILE_PALETTE[i % TILE_PALETTE.length];
            const Icon = TILE_ICONS[i % TILE_ICONS.length];
            const tag = statusTag(p);
            const pct = placementPct(p);
            return (
              <Link
                key={p.id}
                href={`/admin/partners/${p.id}`}
                className="wa-kit-card wa-kit-card--hover wa-kit-focus"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: tile.bg,
                      color: colorVar(tile.color),
                    }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
                </div>

                <h4 style={{ fontWeight: 800, fontSize: 15, marginTop: 12 }}>{p.name}</h4>
                <p style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 2 }}>
                  {p.referrals.toLocaleString()} referrals · {p.placed.toLocaleString()} placed
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--wa-border)',
                  }}
                >
                  <span style={{ color: 'var(--wa-muted)' }}>{tag.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--wa-success)' }}>{pct}% placement</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DesignSurface>
  );
}
