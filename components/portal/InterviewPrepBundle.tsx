'use client';

import { useState, useEffect } from 'react';
import { Send, FileText, Loader2, Mail, Copy, Check, Trash2 } from 'lucide-react';

export type PrepBundleItem = {
  toolType: string;
  title: string;
  content: string;
  createdAt: string;
};

export default function InterviewPrepBundle() {
  const [bundle, setBundle] = useState<{ items: PrepBundleItem[]; empty: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/member/prep-bundle')
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          setBundle({ items: data.items, empty: data.empty });
          // Default all items selected
          setSelected(new Set(data.items.map((i: PrepBundleItem) => i.toolType)));
        } else {
          setBundle({ items: [], empty: true });
        }
      })
      .catch(() => setBundle({ items: [], empty: true }))
      .finally(() => setLoading(false));
  }, []);

  const selectedItems = bundle?.items.filter(i => selected.has(i.toolType)) ?? [];

  function toggle(toolType: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(toolType)) next.delete(toolType);
      else next.add(toolType);
      return next;
    });
  }

  function selectAll() {
    if (!bundle) return;
    setSelected(new Set(bundle.items.map(i => i.toolType)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function sendEmail() {
    if (selectedItems.length === 0) {
      alert('Select at least one item to include in the bundle.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/member/prep-bundle/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedToolTypes: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) setSentTo(data.sentTo);
      else alert(data.error || 'Email failed');
    } catch {
      alert('Email failed');
    } finally {
      setSending(false);
    }
  }

  async function copySelected() {
    if (selectedItems.length === 0) {
      alert('Select at least one item to copy.');
      return;
    }
    const text = selectedItems.map(i => `--- ${i.title} ---\n${i.content}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '2rem 0' }}>
        <Loader2 size={20} className="ai-tool-submit-spinner" />
        <span>Building your prep bundle…</span>
      </div>
    );
  }

  if (!bundle || bundle.empty) {
    return (
      <div
        style={{
          padding: '2rem 1rem',
          borderRadius: '0.75rem',
          background: 'var(--surface-container)',
          textAlign: 'center',
        }}
      >
        <FileText size={40} style={{ marginBottom: '0.75rem', color: 'var(--color-accent)' }} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          No prep materials yet
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          Run a few AI tools first — resume, cover letter, elevator pitch, interview practice — then come back here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
          {selectedItems.length} of {bundle.items.length} selected
        </span>
        <button
          type="button"
          onClick={selectAll}
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Select all
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>·</span>
        <button
          type="button"
          onClick={deselectAll}
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-on-surface-variant)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Deselect all
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={sendEmail}
          disabled={sending || selectedItems.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {sending ? <Loader2 size={16} className="ai-tool-submit-spinner" /> : <Mail size={16} />}
          {sending ? 'Sending…' : 'Email me'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={copySelected}
          disabled={selectedItems.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy selected'}
        </button>
      </div>

      {sentTo && (
        <div
          className="alert alert-success"
          style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}
        >
          Bundle sent to {sentTo} ({selectedItems.length} items).
        </div>
      )}

      {/* Item cards with checkboxes */}
      {bundle.items.map(item => {
        const isSelected = selected.has(item.toolType);
        return (
          <div
            key={item.toolType}
            style={{
              marginBottom: '1rem',
              border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
              borderRadius: '0.75rem',
              background: 'var(--surface-container)',
              overflow: 'hidden',
              opacity: isSelected ? 1 : 0.6,
              transition: 'opacity 0.15s',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--color-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(item.toolType)}
                aria-label={`Include ${item.title} in bundle`}
                style={{ width: '1.125rem', height: '1.125rem', accentColor: 'var(--color-accent)', cursor: 'pointer', flexShrink: 0 }}
              />
              <FileText size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div
              style={{
                padding: '1rem',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                maxHeight: '240px',
                overflowY: 'auto',
              }}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
