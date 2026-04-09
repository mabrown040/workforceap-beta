'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import PartnerEditModal from './PartnerEditModal';
import PartnerDeactivateDialog from './PartnerDeactivateDialog';

type Partner = { id: string; name: string; slug: string; contactName: string | null; contactEmail: string | null; contactPhone: string | null; active: boolean; notes: string | null; _count: { counselors: number; referrals: number } };
type Subgroup = { id: string; name: string; type: string; partnerId: string | null };
type Props = { partners: Partner[]; subgroups: Subgroup[] };

export default function PartnersTableClient({ partners, subgroups }: Props) {
  const router = useRouter();
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [deactivatePartner, setDeactivatePartner] = useState<Partner | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = partners;
    if (filter === 'active') list = list.filter((p) => p.active);
    if (filter === 'inactive') list = list.filter((p) => !p.active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.contactEmail?.toLowerCase().includes(q) ?? false) || (p.contactName?.toLowerCase().includes(q) ?? false));
    }
    return list;
  }, [partners, filter, search]);

  return (<>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>{(['all', 'active', 'inactive'] as const).map((f) => (<button key={f} type="button" onClick={() => setFilter(f)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: `1px solid ${filter === f ? 'var(--color-accent)' : 'var(--outline-variant)'}`, background: filter === f ? 'rgba(173,44,77,0.08)' : 'var(--color-white)', color: filter === f ? 'var(--color-accent)' : 'var(--color-on-surface)', cursor: 'pointer', fontSize: '0.9rem' }}>{f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}</button>))}</div>
      <input type="search" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '0.4rem 0.75rem', minWidth: 220, border: '1px solid var(--outline-variant)', borderRadius: '6px', fontSize: '0.9rem' }} />
    </div>

    <div className="admin-table-scroll admin-partners-desktop">
      <table className="admin-table"><thead><tr><th>Organization</th><th>Contact</th><th>Subgroup</th><th>Counselors</th><th>Members Referred</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((partner) => { const partnerSubgroups = subgroups.filter((s) => s.type === 'partner' && s.partnerId === partner.id); return (<tr key={partner.id}><td><div style={{ fontWeight: 600 }}>{partner.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{partner.slug}</div></td><td style={{ fontSize: '0.9rem' }}>{partner.contactName && <div>{partner.contactName}</div>}{partner.contactEmail && <div style={{ color: 'var(--color-on-surface-variant)' }}>{partner.contactEmail}</div>}</td><td style={{ fontSize: '0.9rem' }}>{partnerSubgroups.length > 0 ? partnerSubgroups.map((s) => s.name).join(', ') : '—'}</td><td style={{ textAlign: 'center' }}>{partner._count.counselors}</td><td style={{ textAlign: 'center' }}>{partner._count.referrals}</td><td><span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', background: partner.active ? 'rgba(74, 155, 79, 0.12)' : 'var(--surface-container)', color: partner.active ? '#2d7a32' : 'var(--color-on-surface-variant)' }}>{partner.active ? 'Active' : 'Inactive'}</span></td><td><div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><button type="button" onClick={() => setEditPartner(partner)} aria-label={`Edit ${partner.name}`} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }} title="Edit"><Pencil size={16} /></button>{partner.active ? <button type="button" onClick={() => setDeactivatePartner(partner)} aria-label={`Deactivate ${partner.name}`} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }} title="Deactivate"><Trash2 size={16} /></button> : <button type="button" onClick={async () => { setReactivatingId(partner.id); try { const res = await fetch(`/api/admin/partners/${partner.id}/reactivate`, { method: 'POST' }); if (res.ok) router.refresh(); } finally { setReactivatingId(null); } }} disabled={reactivatingId === partner.id} aria-label={`Reactivate ${partner.name}`} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: reactivatingId === partner.id ? 'wait' : 'pointer', color: 'var(--color-on-surface-variant)' }} title="Reactivate"><RotateCcw size={16} /></button>}<Link href={`/admin/partners/${partner.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.9rem', marginLeft: '0.25rem' }}>Manage &rarr;</Link></div></td></tr>);})}</tbody></table>
    </div>

    <ul className="admin-portal-card-list admin-partners-cards" aria-label="Partners (mobile layout)">{filtered.map((partner) => { const partnerSubgroups = subgroups.filter((s) => s.type === 'partner' && s.partnerId === partner.id); return (<li key={partner.id} className="admin-portal-card"><div className="admin-portal-card__header"><div><div style={{ fontWeight: 700 }}>{partner.name}</div><div className="admin-portal-card__meta">{partner.slug}</div></div><span className="admin-portal-card__badge" style={{ background: partner.active ? 'rgba(74,155,79,0.12)' : 'var(--surface-container)', color: partner.active ? '#2d7a32' : 'var(--color-on-surface-variant)' }}>{partner.active ? 'Active' : 'Inactive'}</span></div><p className="admin-portal-card__meta">{partner.contactName ?? '—'}</p><p className="admin-portal-card__meta">{partner.contactEmail ?? '—'}</p><p className="admin-portal-card__row"><span className="admin-portal-card__label">Subgroup</span> {partnerSubgroups.length > 0 ? partnerSubgroups.map((s) => s.name).join(', ') : '—'}</p><p className="admin-portal-card__row"><span className="admin-portal-card__label">Counselors</span> {partner._count.counselors}</p><p className="admin-portal-card__row"><span className="admin-portal-card__label">Members</span> {partner._count.referrals}</p><div className="admin-portal-card__actions"><button type="button" onClick={() => setEditPartner(partner)} className="btn btn-outline btn-sm">Edit</button>{partner.active ? <button type="button" onClick={() => setDeactivatePartner(partner)} className="btn btn-outline btn-sm">Deactivate</button> : <button type="button" onClick={async () => { setReactivatingId(partner.id); try { const res = await fetch(`/api/admin/partners/${partner.id}/reactivate`, { method: 'POST' }); if (res.ok) router.refresh(); } finally { setReactivatingId(null); } }} disabled={reactivatingId === partner.id} className="btn btn-outline btn-sm">Reactivate</button>}<Link href={`/admin/partners/${partner.id}`} className="btn btn-primary btn-sm">Manage</Link></div></li>);})}</ul>

    {filtered.length === 0 && (
      <div className="admin-empty-state">
        <h3>{partners.length === 0 ? 'No partners yet.' : 'No partners match your filters.'}</h3>
        <p>{partners.length === 0 ? 'Partners you add will appear in this list.' : 'Try adjusting your search or filters.'}</p>
      </div>
    )}

    {editPartner && <PartnerEditModal partner={editPartner} subgroups={subgroups} onClose={() => setEditPartner(null)} />}
    {deactivatePartner && <PartnerDeactivateDialog partner={deactivatePartner} partners={partners} onClose={() => setDeactivatePartner(null)} />}
  </>);
}
