'use client';

import Link from 'next/link';
import { useState, useEffect, type CSSProperties } from 'react';
import { FileText, Mail, Copy, Check } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';

export type PrepBundleItem = {
  toolType: string;
  title: string;
  content: string;
  createdAt: string;
};

const KIT_BTN =
  'wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none';

const kitBtnSolid: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 44,
  padding: '10px 16px',
  background: 'var(--wa-accent)',
  color: 'var(--wa-on-accent)',
  border: '1px solid var(--wa-accent)',
  fontWeight: 600,
  fontSize: 14,
  borderRadius: 999,
  cursor: 'pointer',
};

const kitBtnOutline: CSSProperties = {
  ...kitBtnSolid,
  background: 'transparent',
  color: 'var(--wa-accent)',
  border: '1px solid var(--wa-border)',
};

const EMPTY_TOOLS = [
  { label: 'Resume', href: '/dashboard/ai-tools/resume-studio?view=rewrite', desc: 'Polished version of your resume' },
  { label: 'Cover letter', href: '/dashboard/ai-tools/cover-letter', desc: 'Letter for a saved job posting' },
  { label: 'Elevator pitch', href: '/dashboard/ai-tools/elevator-pitch', desc: '10–20 second intro you can rehearse' },
  { label: 'Interview practice', href: '/dashboard/ai-tools/interview-practice', desc: 'Mock Q&A with instant feedback' },
  { label: 'LinkedIn headline', href: '/dashboard/ai-tools/linkedin-headline', desc: 'Headline for your profile' },
  { label: 'Salary negotiation', href: '/dashboard/ai-tools/salary-negotiation', desc: 'Script for an offer conversation' },
];

export default function InterviewPrepBundle({
  preview = false,
  items,
}: {
  /** Skip fetch / email POST — /dev/member proofs. */
  preview?: boolean;
  items?: PrepBundleItem[];
} = {}) {
  const seeded = preview ? { items: items ?? [], empty: !(items && items.length) } : null;
  const [bundle, setBundle] = useState<{ items: PrepBundleItem[]; empty: boolean } | null>(seeded);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((items ?? []).map((i) => i.toolType)),
  );
  const [loading, setLoading] = useState(!preview);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preview) return;
    fetch('/api/member/prep-bundle')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setBundle({ items: data.items, empty: data.empty });
          setSelected(new Set(data.items.map((i: PrepBundleItem) => i.toolType)));
        } else {
          setBundle({ items: [], empty: true });
        }
      })
      .catch(() => setBundle({ items: [], empty: true }))
      .finally(() => setLoading(false));
  }, [preview]);

  const selectedItems = bundle?.items.filter((i) => selected.has(i.toolType)) ?? [];

  function toggle(toolType: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(toolType)) next.delete(toolType);
      else next.add(toolType);
      return next;
    });
  }

  function selectAll() {
    if (!bundle) return;
    setSelected(new Set(bundle.items.map((i) => i.toolType)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function sendEmail() {
    if (selectedItems.length === 0) {
      setErrorMessage('Select at least one item to include in the bundle.');
      return;
    }
    setErrorMessage(null);
    if (preview) {
      setSentTo('preview@workforceap.org');
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
      else setErrorMessage(data.error || 'Email failed');
    } catch {
      setErrorMessage('Email failed');
    } finally {
      setSending(false);
    }
  }

  async function copySelected() {
    if (selectedItems.length === 0) {
      setErrorMessage('Select at least one item to copy.');
      return;
    }
    setErrorMessage(null);
    const text = selectedItems.map((i) => `--- ${i.title} ---\n${i.content}`).join('\n\n');
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
      <div role="status" aria-live="polite" className="wa-kit-card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PortalInlineSpinner size={20} />
          <span style={{ fontSize: 14, color: 'var(--wa-muted)' }}>Loading bundle…</span>
        </div>
      </div>
    );
  }

  if (!bundle || bundle.empty) {
    return (
      <div>
        <div className="wa-kit-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', margin: '0 0 0.35rem' }}>
            No prep materials yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', margin: 0, lineHeight: 1.5 }}>
            Run a tool and it shows up here to email or copy.
          </p>
        </div>
        <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }}>
          {EMPTY_TOOLS.map((tool, i) => (
            <Link
              key={tool.href}
              href={preview ? '#' : tool.href}
              className="wa-kit-focus hover:wa-opacity-90 wa-transition-opacity wa-duration-150 motion-reduce:wa-transition-none"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                minHeight: 72,
                padding: '14px 18px',
                borderTop: i === 0 ? 'none' : '1px solid var(--wa-border)',
                textDecoration: 'none',
                color: 'var(--wa-text)',
              }}
            >
              <FileText size={18} aria-hidden="true" style={{ color: 'var(--wa-accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{tool.label}</div>
                <div style={{ fontSize: 13, color: 'var(--wa-muted)', marginTop: 4 }}>{tool.desc}</div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--wa-accent)',
                  border: '1px solid var(--wa-border)',
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                Open
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--wa-muted)', fontWeight: 600, marginRight: 4 }}>
          {selectedItems.length} of {bundle.items.length} selected
        </span>
        <button type="button" onClick={selectAll} className={KIT_BTN} style={kitBtnOutline}>
          Select all
        </button>
        <button type="button" onClick={deselectAll} className={KIT_BTN} style={kitBtnOutline}>
          Deselect
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={KIT_BTN}
          onClick={sendEmail}
          disabled={sending || selectedItems.length === 0}
          aria-busy={sending}
          style={{
            ...kitBtnSolid,
            opacity: sending || selectedItems.length === 0 ? 0.55 : 1,
            cursor: sending || selectedItems.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? <PortalInlineSpinner size={16} /> : <Mail size={16} aria-hidden="true" />}
          <span aria-live="polite">{sending ? 'Sending…' : 'Email me'}</span>
        </button>
        <button
          type="button"
          className={KIT_BTN}
          onClick={copySelected}
          disabled={selectedItems.length === 0}
          style={{
            ...kitBtnOutline,
            opacity: selectedItems.length === 0 ? 0.55 : 1,
            cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy selected'}</span>
        </button>
      </div>

      {errorMessage ? (
        <p role="alert" style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--wa-danger)' }}>
          {errorMessage}
        </p>
      ) : null}

      {sentTo ? (
        <div
          className="wa-kit-card"
          style={{
            marginBottom: 16,
            background: 'var(--wa-success-soft)',
            borderColor: 'color-mix(in srgb, var(--wa-success) 28%, transparent)',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'var(--wa-text)' }}>
            Bundle sent to {sentTo} ({selectedItems.length} items).
          </p>
        </div>
      ) : null}

      {bundle.items.map((item) => {
        const isSelected = selected.has(item.toolType);
        return (
          <div
            key={item.toolType}
            className="wa-kit-card"
            style={{
              marginBottom: 12,
              padding: 0,
              overflow: 'hidden',
              opacity: isSelected ? 1 : 0.72,
            }}
          >
            <button
              type="button"
              onClick={() => toggle(item.toolType)}
              className="wa-kit-focus"
              aria-pressed={isSelected}
              aria-label={`${isSelected ? 'Exclude' : 'Include'} ${item.title} in bundle`}
              style={{
                width: '100%',
                minHeight: 44,
                padding: '12px 16px',
                border: 'none',
                borderBottom: '1px solid var(--wa-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'transparent',
                color: 'var(--wa-text)',
                cursor: 'pointer',
                textAlign: 'left',
                font: 'inherit',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: isSelected ? '1px solid var(--wa-accent)' : '1px solid var(--wa-border)',
                  background: isSelected ? 'var(--wa-accent)' : 'var(--wa-surface)',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected ? <Check size={12} style={{ color: 'var(--wa-on-accent)' }} /> : null}
              </span>
              <FileText size={16} aria-hidden="true" style={{ color: 'var(--wa-accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wa-muted)', whiteSpace: 'nowrap' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </button>
            <div
              style={{
                padding: 'var(--wa-pad-sm)',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                maxHeight: 240,
                overflowY: 'auto',
                color: 'var(--wa-text)',
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
