'use client';

import { useState, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';

export interface ChatMessage {
  id: string;
  from: 'self' | 'other';
  text: string;
  /** Label/avatar content for "other" messages (e.g. initials). */
  author?: ReactNode;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  placeholder?: string;
  onSend?: (text: string) => void;
}

/**
 * Message thread + composer. Member↔counselor messages and the AI advisor.
 * Mockup: voice-studio AI advisor, member messages.
 */
export function ChatThread({ messages, placeholder = 'Type a message…', onSend }: ChatThreadProps) {
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend?.(t);
    setText('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', padding: 4 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', gap: 10, justifyContent: m.from === 'self' ? 'flex-end' : 'flex-start' }}>
            {m.from === 'other' && m.author ? (
              <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--wa-info)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {m.author}
              </div>
            ) : null}
            <div
              style={{
                maxWidth: '78%',
                fontSize: 13,
                padding: '10px 14px',
                borderRadius: 18,
                ...(m.from === 'self'
                  ? { background: 'var(--wa-accent)', color: '#fff', borderTopRightRadius: 4 }
                  : { background: 'var(--wa-bg)', border: '1px solid var(--wa-border)', borderTopLeftRadius: 4 }),
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--wa-border)', borderRadius: 999, padding: '6px 6px 6px 16px' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={placeholder}
          aria-label="Message"
          style={{ flex: 1, fontSize: 13, border: 'none', outline: 'none', background: 'transparent', color: 'var(--wa-text)' }}
        />
        <button
          type="button"
          onClick={send}
          aria-label="Send"
          className="wa-kit-focus"
          style={{ width: 44, height: 44, borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--wa-accent)', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
