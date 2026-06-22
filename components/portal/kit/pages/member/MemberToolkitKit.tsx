'use client';

import { Wand2, FileText, MailOpen, Mic, MessagesSquare, Circle } from 'lucide-react';
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
}

export interface MemberToolkitKitProps {
  heroTitle?: string;
  heroSubtitle?: string;
  tools?: ToolCard[];
  advisorOnline?: boolean;
  advisorMessages?: ChatMessage[];
  onSend?: (text: string) => void;
}

const DEFAULT_TOOLS: ToolCard[] = [
  { id: 'resume', icon: <FileText size={20} />, title: 'Resume Audit', body: 'Score your resume against the role and get fix-it suggestions.', cta: 'Run Audit' },
  { id: 'cover', icon: <MailOpen size={20} />, title: 'Cover Letter', body: 'Generate a tailored cover letter for any saved job in seconds.', cta: 'Generate' },
  { id: 'interview', icon: <Mic size={20} />, title: 'Interview Prep', body: 'Practice common questions with instant AI feedback.', cta: 'Start Session' },
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    from: 'other',
    author: <MessagesSquare size={13} />,
    text: "Hey Mike — you're 78% through AWS Practitioner. Want me to draft a cover letter for the Deloitte Salesforce role while you finish the last modules?",
  },
  { id: 'm2', from: 'self', text: 'Yes, and tailor it to my Austin location.' },
];

export function MemberToolkitKit({
  heroTitle = 'Get hired faster.',
  heroSubtitle = 'AI tools tuned to your AWS path and local Austin market.',
  tools = DEFAULT_TOOLS,
  advisorOnline = true,
  advisorMessages = DEFAULT_MESSAGES,
  onSend,
}: MemberToolkitKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        {/* Gradient hero */}
        <div className="wa-kit-card wa-kit-card--gradient-crimson">
          <div className="wa-flex wa-items-center wa-gap-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
            <Wand2 size={13} />
            AI Career Toolkit
          </div>
          <h2 className="h-font" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>
            {heroTitle}
          </h2>
          <p style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{heroSubtitle}</p>
        </div>

        {/* Tool cards */}
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4">
          {tools.map((tool) => (
            <div key={tool.id} className="wa-kit-card wa-kit-card--hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{ padding: 12, width: 'fit-content', background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', borderRadius: 'var(--wa-radius-sm)' }}
                >
                  {tool.icon}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginTop: 16 }}>{tool.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 4 }}>{tool.body}</p>
              </div>
              <button
                type="button"
                className="wa-kit-focus"
                style={{
                  marginTop: 16,
                  width: '100%',
                  padding: '8px 0',
                  background: 'var(--wa-accent)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {tool.cta}
              </button>
            </div>
          ))}
        </div>

        {/* AI Advisor */}
        <div className="wa-kit-card">
          <div className="wa-flex wa-items-center wa-gap-3" style={{ marginBottom: 16 }}>
            <div style={{ padding: 10, background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', borderRadius: 'var(--wa-radius-sm)' }}>
              <MessagesSquare size={18} />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>AI Advisor</h3>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)' }}>24/7 career guidance</p>
            </div>
            {advisorOnline ? (
              <span
                className="wa-flex wa-items-center wa-gap-1"
                style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--wa-success)' }}
              >
                <Circle size={6} fill="currentColor" />
                Online
              </span>
            ) : null}
          </div>
          <div style={{ minHeight: 200 }}>
            <ChatThread
              messages={advisorMessages}
              placeholder="Ask your advisor anything…"
              onSend={onSend}
            />
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
