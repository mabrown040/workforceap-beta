'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

type PartnerMember = {
  id: string;
  fullName: string;
  stage: string;
  stageLabel: string;
  progress: number;
  programTitle: string;
  story: string;
  /** When this member was referred to WorkforceAP (shown instead of generic profile update date). */
  referredAtLabel: string;
  /** Same field the partner payout flow gates on; null when there's no placement yet. */
  placementVerified?: boolean | null;
};

export default function PartnerMembersList({ members }: { members: PartnerMember[] }) {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((member) => {
      if (stage !== 'all' && member.stage !== stage) return false;
      if (!q) return true;
      return [member.fullName, member.programTitle, member.story, member.stageLabel, member.referredAtLabel]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [members, search, stage]);

  return (
    <section className="partner-members">
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members, program, or status"
          aria-label="Search referred members by name, program, or status"
          style={{ minWidth: 260, flex: '1 1 280px', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--color-border, #ddd)' }}
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Filter by member journey stage"
          style={{ padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--color-border, #ddd)' }}
        >
          <option value="all">All stages</option>
          <option value="applied">Applied</option>
          <option value="enrolled">Enrolled</option>
          <option value="in_training">In training</option>
          <option value="certified">Certified</option>
          <option value="placed">Placed</option>
        </select>
      </div>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>{filtered.length} member{filtered.length !== 1 ? 's' : ''} shown</p>
      <div className="partner-members-list">
        {filtered.map((member) => (
          <Link key={member.id} href={`/partner/referred-members/${member.id}`} className="partner-member-card">
            <div className="partner-member-main">
              <span className="partner-member-name">{member.fullName}</span>
              <span className="partner-member-story">{member.story}</span>
            </div>
            <div className="partner-member-meta">
              <span className={`partner-member-stage stage-${member.stage}`}>{member.stageLabel}</span>
              {member.stage === 'placed' && (
                <StatusBadge
                  label={member.placementVerified ? 'Verified' : 'Pending verification'}
                  variant={member.placementVerified ? 'success' : 'warning'}
                />
              )}
              <span className="partner-member-date">Referred {member.referredAtLabel}</span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.5rem' }} aria-hidden="true">
            search_off
          </span>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            No members match this filter.
          </p>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem' }}>
            {members.length === 0
              ? "You haven't referred any members yet. Use the Invite Member button to start."
              : "Try clearing your search or changing the stage filter."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
