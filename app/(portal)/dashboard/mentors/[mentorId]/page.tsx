'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

// Server component wrapper — fetches data, then renders client form
import type { Mentor } from '@prisma/client';

async function getMentor(mentorId: string): Promise<Pick<Mentor, 'id' | 'fullName' | 'title' | 'company' | 'industry' | 'bio' | 'linkedinUrl'> | null> {
  return prisma.mentor.findFirst({
    where: { id: mentorId, isActive: true, approvedAt: { not: null } },
    select: { id: true, fullName: true, title: true, company: true, industry: true, bio: true, linkedinUrl: true },
  });
}

export default async function MentorProfilePage({ params }: { params: Promise<{ mentorId: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const { mentorId } = await params;
  const mentor = await getMentor(mentorId);

  if (!mentor) redirect('/dashboard/mentors');

  return (
    <>
      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ padding: '1rem', paddingBottom: '6rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mentor.fullName}</h1>
        <div style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>{mentor.title}</div>
        <div style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>{mentor.company} · {mentor.industry}</div>
        <p style={{ lineHeight: 1.6 }}>{mentor.bio}</p>
        {mentor.linkedinUrl ? (
          <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', color: 'var(--color-accent)' }}>LinkedIn Profile</a>
        ) : null}
        <MentorSessionForm mentorId={mentor.id} />
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden wa-md:wa-block" style={{ padding: '1.5rem', maxWidth: '52rem' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700 }}>{mentor.fullName}</h1>
        <div style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>{mentor.title}</div>
        <div style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.9rem' }}>{mentor.company} · {mentor.industry}</div>
        <p style={{ lineHeight: 1.7 }}>{mentor.bio}</p>
        {mentor.linkedinUrl ? (
          <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', color: 'var(--color-accent)' }}>LinkedIn Profile</a>
        ) : null}
        <div style={{ maxWidth: '32rem' }}>
          <MentorSessionForm mentorId={mentor.id} />
        </div>
      </div>
    </>
  );
}

// ── Client component: session request form ─────────────────────────────────
function MentorSessionForm({ mentorId }: { mentorId: string }) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`/api/mentors/${mentorId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt, topic }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(74,155,79,0.1)', borderRadius: '0.5rem', color: 'var(--color-on-surface)' }}>
        ✅ Session request sent! Your mentor will confirm a time.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 0 }}>Request a Session</h2>
      <input
        type="datetime-local" required value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        style={{ border: '1px solid var(--surface-container-high)', borderRadius: '0.5rem', padding: '0.55rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
      />
      <textarea
        placeholder="Topic or questions you'd like to cover" rows={3} required value={topic}
        onChange={(e) => setTopic(e.target.value)}
        style={{ border: '1px solid var(--surface-container-high)', borderRadius: '0.5rem', padding: '0.55rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', resize: 'vertical' }}
      />
      {status === 'error' && <p style={{ color: 'var(--color-accent)', fontSize: '0.85rem' }}>Something went wrong. Please try again.</p>}
      <button type="submit" disabled={status === 'loading'} style={{ border: 0, borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontWeight: 600, background: 'var(--color-accent)', color: '#fff', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
        {status === 'loading' ? 'Sending…' : 'Request a Session'}
      </button>
    </form>
  );
}
