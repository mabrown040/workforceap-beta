'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import styles from './notesPanel.module.css';

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: { fullName: string | null; email: string };
}

export default function CounselorNotesPanel({ memberId }: { memberId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(`/api/counselor/members/${memberId}/notes`, {}, 15000);
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
      const res = await fetchWithTimeout(`/api/counselor/members/${memberId}/notes`, {
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
    setDeleting(true);
    try {
      const res = await fetchWithTimeout(`/api/counselor/members/${memberId}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      }, 15000);
      if (!res.ok) throw new Error('Failed to delete note');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      setDeleteError('Could not delete note. Please try again.');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
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
          Counselor Notes
        </h3>
        {!adding && (
          <button type="button"
            onClick={() => setAdding(true)}
            className={styles.addButton}
          >
            + Add Note
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor={`counselor-note-${memberId}`} className="wa-sr-only">
            Counselor note
          </label>
          <textarea
            id={`counselor-note-${memberId}`}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note about this member..."
            rows={3}
            style={{
              width: '100%',
              border: '1px solid var(--outline-variant)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              background: 'var(--surface-container-low)',
              color: 'var(--color-on-surface)',
              boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: 'var(--color-accent)', fontSize: '0.75rem', margin: '0.25rem 0' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button"
              onClick={handleAdd}
              disabled={submitting || !newNote.trim()}
              className={styles.saveButton}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button"
              onClick={() => { setAdding(false); setNewNote(''); setError(''); }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
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
          No notes yet. Add one to track progress.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notes.map((note) => (
          <div key={note.id} style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '0.75rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
                {new Date(note.createdAt).toLocaleDateString('en-US')} · {note.author.fullName ?? note.author.email}
              </p>
              <button type="button"
                onClick={() => setConfirmDeleteId(note.id)}
                className={styles.deleteButton}
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

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete note?"
        body="This note will be permanently deleted. This cannot be undone."
        confirmLabel="Delete note"
        danger
        busy={deleting}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
