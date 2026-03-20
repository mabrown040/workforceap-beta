'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type DraftJobCardItem = {
  id: string;
  title: string;
  location: string;
  descriptionPreview: string;
  updatedAt: Date;
};

export default function DraftJobCards({ drafts }: { drafts: DraftJobCardItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (drafts.length === 0) return null;

  async function submitForReview(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Could not submit for review');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Draft jobs</h2>
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        New and imported postings start as drafts. Submit for WorkforceAP review when ready, or edit details first.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {drafts.map((d) => (
          <article
            key={d.id}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '1rem',
              background: 'var(--color-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: 1.3 }}>{d.title}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
              {d.location} · Updated {d.updatedAt.toLocaleDateString()}
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-gray-700)', margin: 0, flex: 1, lineHeight: 1.45 }}>
              {d.descriptionPreview}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busyId === d.id}
                onClick={() => submitForReview(d.id)}
              >
                {busyId === d.id ? 'Submitting…' : 'Submit for review'}
              </button>
              <Link href={`/employer/jobs/${d.id}`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
