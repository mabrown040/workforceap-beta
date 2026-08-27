'use client';

import { Wand2, FileText, MailOpen, Mic, MessagesSquare, Circle } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DesignSurface, ChatThread, type ChatMessage } from '@/components/portal/kit';

/**
 * Member Portal — CAREER TOOLKIT view (AI tools + advisor).
 * Faithful port of `data-view-panel="toolkit"` in
 * docs/mockups/workforceap-member-suite.html.
 *
 * Interactive (AI advisor composer) → 'use client'.
 *
 * Target route: app/(portal)/dashboard/toolkit
 * Surface: warm (member-facing).
 */

interface ToolCard {
  id: string;
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
  /** Destination route for the CTA (renders the CTA as a navigating link). */
  href?: string;
}

export interface MemberToolkitKitProps {
  heroTitle?: string;
  heroSubtitle?: string;
  tools?: ToolCard[];
  advisorOnline?: boolean;
  advisorMessages?: ChatMessage[];
  /**
   * Per-tool CTA handler. When supplied it takes precedence over a tool's
   * `href` (the CTA renders as a button calling `onAction(tool.id)`).
   */
  onAction?: (toolId: string) => void;
  /**
   * AI Advisor composer send handler. The advisor is a text composer only when
   * a real send path is wired in by the caller. With no `onSend` there is no
   * live text-advisor backend, so the composer is replaced by an honest
   * empty-state pointing members at the (live) voice career coach rather than
   * silently discarding typed messages.
   */
  onSend?: (text: string) => void;
}

/**
 * CTAs link to the existing, real member AI-tool routes (the same destinations
 * used across the portal, e.g. ai-tools index, certifications, CareerCounselor).
 */
const DEFAULT_TOOLS: ToolCard[] = [
  { id: 'resume', icon: <FileText size={20} aria-hidden="true" />, title: 'Resume Audit', body: 'Score your resume against the role and get fix-it suggestions.', cta: 'Run Audit', href: '/dashboard/ai-tools/resume-analysis' },
  { id: 'cover', icon: <MailOpen size={20} aria-hidden="true" />, title: 'Cover Letter', body: 'Generate a tailored cover letter for any saved job in seconds.', cta: 'Generate', href: '/dashboard/ai-tools/cover-letter' },
  { id: 'interview', icon: <Mic size={20} aria-hidden="true" />, title: 'Interview Prep', body: 'Practice common questions with instant AI feedback.', cta: 'Start Session', href: '/dashboard/ai-tools/interview-prep' },
];

export function MemberToolkitKit({
  heroTitle = 'Resume, cover letter, interview',
  heroSubtitle = 'Each tool uses your program and saved jobs. Pick one and go.',
  tools = DEFAULT_TOOLS,
  advisorOnline = true,
  advisorMessages,
  onAction,
  onSend,
}: MemberToolkitKitProps) {
  // No fabricated transcript: with no real advisor history supplied, show a
  // neutral, non-persona empty-state greeting rather than a fake exchange.
  const messages: ChatMessage[] =
    advisorMessages ??
    [
      {
        id: 'advisor-empty',
        from: 'other',
        author: <MessagesSquare size={13} />,
        text: 'Ask me about your resume, a job posting, or interview prep and I can point you to the right tool.',
      },
    ];
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <h1 className="sr-only">Career toolkit</h1>
        {/* Gradient hero */}
        <div className="wa-kit-card wa-kit-card--gradient-crimson">
          <div className="wa-flex wa-items-center wa-gap-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
            <Wand2 size={13} aria-hidden="true" />
            AI Career Toolkit
          </div>
          <h2 className="h-font" style={{ fontSize: 'clamp(21px, 5.5vw, 28px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4, textWrap: 'balance' }}>
            {heroTitle}
          </h2>
          <p style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{heroSubtitle}</p>
        </div>

        {/* Tool list — one path, not a 3-up icon-circle grid. */}
        <div className="wa-kit-card" style={{ padding: 0, overflow: 'hidden' }}>
          {tools.map((tool, i) => {
            const row = (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--wa-muted)',
                    minWidth: 28,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: 0, textWrap: 'balance' }}>{tool.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--wa-muted)', margin: '4px 0 0' }}>{tool.body}</p>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--wa-accent)',
                    flexShrink: 0,
                  }}
                >
                  {tool.cta}
                </span>
              </>
            );
            const rowStyle = {
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              minHeight: 72,
              padding: '14px 18px',
              borderTop: i === 0 ? 'none' : '1px solid var(--wa-border)',
              textDecoration: 'none',
              color: 'var(--wa-text)',
              width: '100%',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left' as const,
            };
            const rowClass =
              'wa-kit-focus hover:wa-opacity-90 wa-transition-opacity wa-duration-150 motion-reduce:wa-transition-none';
            if (onAction) {
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onAction(tool.id)}
                  className={rowClass}
                  style={rowStyle}
                >
                  {row}
                </button>
              );
            }
            if (tool.href) {
              return (
                <Link key={tool.id} href={tool.href} className={rowClass} style={rowStyle}>
                  {row}
                </Link>
              );
            }
            return (
              <div
                key={tool.id}
                className="wa-kit-focus"
                style={{ ...rowStyle, cursor: 'not-allowed', opacity: 0.6 }}
                aria-disabled="true"
              >
                {row}
              </div>
            );
          })}
        </div>

        {/* AI Advisor */}
        <div className="wa-kit-card">
          <div className="wa-flex wa-items-center wa-gap-3" style={{ marginBottom: 16 }}>
            <div style={{ padding: 10, background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', borderRadius: 'var(--wa-radius-sm)' }}>
              <MessagesSquare size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>AI Advisor</h3>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)' }}>24/7 career guidance</p>
            </div>
            {advisorOnline && onSend ? (
              <span
                className="wa-flex wa-items-center wa-gap-1"
                style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--wa-success)' }}
              >
                <Circle size={6} fill="currentColor" aria-hidden="true" />
                Online
              </span>
            ) : null}
          </div>
          {onSend ? (
            /* Live text composer only when a real send path is wired in. */
            <div style={{ minHeight: 200 }}>
              <ChatThread
                messages={messages}
                placeholder="Ask your advisor anything…"
                onSend={onSend}
              />
            </div>
          ) : (
            /* No wired text-advisor backend. Rendering ChatThread here would
               show a live-looking composer that silently discards input, so
               show the greeting and route members to the live (voice) career
               coach instead. */
            <div style={{ minHeight: 200 }}>
              {messages.map((m) => (
                <p key={m.id} style={{ fontSize: 13, color: 'var(--wa-muted)', margin: '0 0 8px' }}>
                  {m.text}
                </p>
              ))}
              <Link
                href="/dashboard/ai-tools/career-business-coach"
                className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginTop: 16,
                  minHeight: 44,
                  padding: '8px 16px',
                  background: 'var(--wa-accent)',
                  color: 'var(--wa-on-accent)',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                Start a live session with your career coach
              </Link>
            </div>
          )}
        </div>
      </div>
    </DesignSurface>
  );
}
