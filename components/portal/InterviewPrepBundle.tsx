'use client';

import { useState, useEffect } from 'react';
import { Send, FileText, Loader2, Mail, Copy, Check } from 'lucide-react';

export type PrepBundleItem = {
  toolType: string;
  title: string;
  content: string;
  createdAt: string;
};

export default function InterviewPrepBundle() {
  const [bundle, setBundle] = useState<{ items: PrepBundleItem[]; empty: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/member/prep-bundle')
      .then(r => r.json())
      .then(data => {
        if (data.items) setBundle({ items: data.items, empty: data.empty });
        else setBundle({ items: [], empty: true });
      })
      .catch(() => setBundle({ items: [], empty: true }))
      .finally(() => setLoading(false));
  }, []);

  async function sendEmail() {
    setSending(true);
    try {
      const res = await fetch('/api/member/prep-bundle/send', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setSentTo(data.sentTo);
      else alert(data.error || 'Email failed');
    } catch {
      alert('Email failed');
    } finally {
      setSending(false);
    }
  }

  async function copyAll() {
    const text = bundle?.items.map(i => `--- ${i.title} ---\n${i.content}`).join('\n\n');
    if (!text) return;
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
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={sendEmail}
          disabled={sending}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {sending ? <Loader2 size={16} className="ai-tool-submit-spinner" /> : <Mail size={16} />}
          {sending ? 'Sending…' : 'Email me this bundle'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={copyAll}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy all'}
        </button>
      </div>

      {sentTo && (
        <div
          className="alert alert-success"
          style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}
        >
          Bundle sent to {sentTo}.
        </div>
      )}

      {bundle.items.map(item => (
        <div
          key={item.toolType}
          style={{
            marginBottom: '1rem',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem',
            background: 'var(--surface-container)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <FileText size={16} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.title}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>
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
      ))}
    </div>
  );
}
