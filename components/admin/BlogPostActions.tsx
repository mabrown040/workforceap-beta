'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  id: string;
  slug: string;
  published: boolean;
};

export default function BlogPostActions({ id, slug, published }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const togglePublish = async () => {
    setLoading('publish');
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published }),
      });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading('delete');
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      router.push('/admin/blog');
      router.refresh();
    } finally {
      setLoading(null);
      setConfirmDelete(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <Link href={`/admin/blog/${id}/edit`} style={{ color: 'var(--color-accent)' }}>
        Edit
      </Link>
      <Link
        href={published ? `/blog/${slug}` : '#'}
        target={published ? '_blank' : undefined}
        rel={published ? 'noopener noreferrer' : undefined}
        style={{
          color: published ? 'var(--color-accent)' : '#999',
          pointerEvents: published ? 'auto' : 'none',
        }}
      >
        Preview
      </Link>
      <button
        type="button"
        onClick={togglePublish}
        disabled={!!loading}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-accent)',
          cursor: loading ? 'not-allowed' : 'pointer',
          padding: 0,
          fontSize: 'inherit',
        }}
      >
        {loading === 'publish' ? '…' : published ? 'Unpublish' : 'Publish'}
      </button>
      {confirmDelete ? (
        <>
          <span style={{ color: '#666' }}>Delete?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!!loading}
            style={{
              background: '#c00',
              color: 'white',
              border: 'none',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            style={{
              background: '#eee',
              border: 'none',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            No
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#c00',
            cursor: 'pointer',
            padding: 0,
            fontSize: 'inherit',
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
}
