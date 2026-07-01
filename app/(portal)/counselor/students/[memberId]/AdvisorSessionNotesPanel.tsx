'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface SessionNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { fullName: string | null; email: string };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdvisorSessionNotesPanel({ memberId }: { memberId: string }) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      setFetchError(false);
      const res = await fetchWithTimeout(`/api/counselor/members/${memberId}/session-notes`, {}, 15000);
      if (!res.ok) {
        setFetchError(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setNotes(data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`/api/counselor/members/${memberId}/session-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      }, 15000);
      if (!res.ok) throw new Error('Failed to save note');
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNote('');
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeleteError('');
    try {
      const res = await fetchWithTimeout(`/api/counselor/members/${memberId}/session-notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      }, 15000);
      if (!res.ok) throw new Error('Failed to delete note');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      setDeleteError('Could not delete note. Please try again.');
    }
  };

  return (
    <div style={{
      background: 'var(--surface-container, #fff)',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      border: '1px solid var(--outline-variant, #ebe7e7)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: 0 }}>
          Session Notes
        </h3>
        {!adding && (
          <button type="button"
            onClick={() => setAdding(true)}
            style={{
              minWidth: '2.75rem',
              minHeight: '2.75rem',
              padding: '0.5rem 0.875rem',
              background: 'var(--surface-container-highest)',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--color-on-surface)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            + Add Note
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginBottom: '1rem' }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a session note about this member..."
            rows={4}
            style={{
              width: '100%',
              border: '1px solid var(--outline-variant)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: 'var(--color-accent)', fontSize: '0.75rem', margin: '0.25rem 0' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button"
              onClick={handleAdd}
              disabled={submitting || !newNote.trim()}
              style={{
                minWidth: '2.75rem',
                minHeight: '2.75rem',
                padding: '0.5rem 1rem',
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: submitting ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button"
              onClick={() => { setAdding(false); setNewNote(''); setError(''); }}
              style={{
                minWidth: '2.75rem',
                minHeight: '2.75rem',
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: 'var(--color-on-surface-variant)',
                border: '1px solid var(--outline-variant)',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-error, #c00)', margin: '0 0 0.5rem' }}>
          {deleteError}
        </p>
      )}

      {fetchError && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-accent, #b00020)', margin: '0 0 0.5rem' }}>
          Couldn’t load notes. Try refreshing the page.
        </p>
      )}

      {loading && <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>Loading notes…</p>}

      {!loading && !fetchError && notes.length === 0 && !adding && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
          No session notes yet. Add one to track progress.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notes.map((note) => (
          <div key={note.id} style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '0.75rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
                {formatDateTime(note.createdAt)} · {note.author.fullName ?? note.author.email}
              </p>
              <button type="button"
                onClick={() => handleDelete(note.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: '0.375rem 0.5rem',
                  lineHeight: 1,
                  minWidth: '2.75rem',
                  minHeight: '2.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Delete note"
                aria-label="Delete note"
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {note.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
