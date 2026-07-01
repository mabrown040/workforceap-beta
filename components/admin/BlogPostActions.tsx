'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type Props = {
  id: string;
  slug: string;
  published: boolean;
};

export default function BlogPostActions({ id, slug, published }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeConfirmDelete = () => setConfirmDelete(false);
  const confirmDeleteTrapRef = useFocusTrap(confirmDelete, closeConfirmDelete);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const togglePublish = async () => {
    setOpen(false);
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
    setOpen(false);
    setConfirmDelete(false);
    setLoading('delete');
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      router.push('/admin/blog');
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="admin-blog-actions-menu" ref={menuRef}>
      <button
        type="button"
        className="admin-blog-actions-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Actions"
      >
        ⋮
      </button>
      {open && (
        <div className="admin-blog-actions-dropdown">
          <Link href={`/admin/blog/${id}/edit`} onClick={() => setOpen(false)}>
            Edit
          </Link>
          <Link
            href={`/admin/blog/preview/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Preview
          </Link>
          <button
            type="button"
            onClick={togglePublish}
            disabled={!!loading}
          >
            {loading === 'publish' ? '…' : published ? 'Unpublish' : 'Publish'}
          </button>
          {confirmDelete ? (
            <div
              ref={confirmDeleteTrapRef as React.RefObject<HTMLDivElement>}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm delete post"
            >
              <span style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                Delete this post?
              </span>
              <button type="button" onClick={handleDelete} disabled={!!loading} data-danger>
                Yes, delete
              </button>
              <button type="button" onClick={closeConfirmDelete}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} data-danger>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
