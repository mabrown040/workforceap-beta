'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Send, Users, Clock, CheckCircle } from 'lucide-react';
import InviteForm from '@/components/admin/InviteForm';
import InvitesTable from '@/components/admin/InvitesTable';
import PageHeader from '@/components/portal/PageHeader';

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  personalMessage: string | null;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: { id: string; fullName: string; email: string };
  subgroup: { id: string; name: string } | null;
};

type Subgroup = { id: string; name: string };
type Program = { slug: string; title: string };

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const invRes = await fetch('/api/admin/invites');
        let sgData: { id: string; name: string }[] = [];
        try {
          const sgRes = await fetch('/api/admin/subgroups');
          if (sgRes.ok) {
            const d = await sgRes.json();
            sgData = (Array.isArray(d) ? d : d.subgroups ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
          }
        } catch {
          // ignore
        }
        setSubgroups(sgData);

        if (invRes.ok) {
          const invData = await invRes.json();
          const list = invData.invites ?? [];
          setInvites(list);
          const now = new Date();
          setStats({
            total: list.length,
            pending: list.filter((i: Invite) => i.status === 'pending' && new Date(i.expiresAt) > now).length,
            accepted: list.filter((i: Invite) => i.status === 'accepted').length,
            expired: list.filter((i: Invite) => i.status === 'expired' || (i.status === 'pending' && new Date(i.expiresAt) <= now)).length,
          });
        }

        const { PROGRAMS } = await import('@/lib/content/programs');
        setPrograms(PROGRAMS.map((p) => ({ slug: p.slug, title: p.title })));
      } catch (err) {
        console.error('Failed to load invites:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [modalOpen]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const acceptanceRate =
    stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Invitations"
        subtitle="Invite admins, partners, or students to the platform."
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={18} />
            Send New Invite
          </button>
        }
      />

      <div className="admin-stat-cards" style={{ marginBottom: '0.5rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <Mail size={24} className="text-current" />
          </div>
          <div className="admin-stat-card-label">Total Invites Sent</div>
          <div className="admin-stat-card-value">{stats.total}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <Clock size={24} className="text-current" />
          </div>
          <div className="admin-stat-card-label">Pending</div>
          <div className="admin-stat-card-value">{stats.pending}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <CheckCircle size={24} className="text-current" />
          </div>
          <div className="admin-stat-card-label">Acceptance Rate</div>
          <div className="admin-stat-card-value">{acceptanceRate}%</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <Users size={24} className="text-current" />
          </div>
          <div className="admin-stat-card-label">Accepted</div>
          <div className="admin-stat-card-value">{stats.accepted}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Invite list</h2>
      <InvitesTable invites={invites} />

      {modalOpen && (
        <InviteForm
          subgroups={subgroups}
          programs={programs}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
