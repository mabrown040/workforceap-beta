'use client';

import { useState } from 'react';
import {
  ChatMessageList,
  ChatMessage as AstryxChatMessage,
  ChatMessageBubble,
  ChatComposer,
} from '@astryxdesign/core/Chat';
import { Avatar } from '@astryxdesign/core/Avatar';

export interface ChatMessage {
  id: string;
  from: 'self' | 'other';
  text: string;
  /** Label/avatar content for "other" messages (e.g. initials). */
  author?: React.ReactNode;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  placeholder?: string;
  onSend?: (text: string) => void;
}

function authorLabel(author: React.ReactNode | undefined): string {
  if (author == null) return 'Counselor';
  if (typeof author === 'string' || typeof author === 'number') return String(author);
  return 'Counselor';
}

/**
 * Message thread + composer — Astryx Chat suite (same primitives as CoachChat).
 * Member↔counselor messages and AI advisor surfaces.
 */
export function ChatThread({ messages, placeholder = 'Type a message…', onSend }: ChatThreadProps) {
  const [text, setText] = useState('');

  const send = (value: string) => {
    const t = value.trim();
    if (!t || !onSend) return;
    onSend(t);
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <ChatMessageList
          density="compact"
          emptyState={
            messages.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--wa-muted)', margin: 0 }}>No messages yet — say hello.</p>
            ) : undefined
          }
        >
          {messages.map((m) =>
            m.from === 'self' ? (
              <AstryxChatMessage key={m.id} sender="user">
                <ChatMessageBubble>{m.text}</ChatMessageBubble>
              </AstryxChatMessage>
            ) : (
              <AstryxChatMessage
                key={m.id}
                sender="assistant"
                avatar={<Avatar name={authorLabel(m.author)} size="small" />}
                name={authorLabel(m.author)}
              >
                <ChatMessageBubble>{m.text}</ChatMessageBubble>
              </AstryxChatMessage>
            ),
          )}
        </ChatMessageList>
      </div>
      <div style={{ marginTop: 12, flexShrink: 0 }}>
        <ChatComposer
          value={text}
          onChange={setText}
          onSubmit={send}
          isDisabled={!onSend}
          placeholder={placeholder}
          density="compact"
        />
      </div>
    </div>
  );
}
