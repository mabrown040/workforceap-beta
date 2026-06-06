'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import styles from './CoachChat.module.css';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type CoachChatGreeting = {
  /** Member's first name, used for the warm greeting. */
  firstName: string;
  /** True when the member has prior coaching memory (returning user). */
  returning: boolean;
  /** What we worked on last, if known. */
  lastTopic: string | null;
  /** The next step the coach suggested, if known. */
  lastAction: string | null;
};

type ApiResponse = { reply?: string; error?: string };

type SuggestedPrompt = {
  /** Short label shown on the chip. */
  label: string;
  /** Full message sent to the coach when tapped. */
  prompt: string;
  /** Leading material-symbols glyph for a little visual warmth. */
  icon: string;
};

/** Static, career-relevant starters that suit any member. */
const BASE_PROMPTS: readonly SuggestedPrompt[] = [
  {
    label: 'Improve my resume',
    prompt: 'Help me improve my resume.',
    icon: 'description',
  },
  {
    label: "What's my next step?",
    prompt: 'Based on what you know about me, what should my next step be?',
    icon: 'flag',
  },
  {
    label: 'Practice an interview',
    prompt: 'Practice an interview question with me.',
    icon: 'forum',
  },
  {
    label: 'Talk about an employment gap',
    prompt: 'How do I talk about my employment gap in an interview?',
    icon: 'schedule',
  },
  {
    label: 'Find jobs that fit me',
    prompt: 'Help me find jobs that fit my skills and goals.',
    icon: 'work',
  },
] as const;

/**
 * Build up to five suggested prompts, personalizing the lead chip from the
 * greeting data already on hand. Purely client-side — no extra server calls.
 */
function buildSuggestedPrompts(greeting: CoachChatGreeting): SuggestedPrompt[] {
  const topic = greeting.lastTopic?.trim();
  const action = greeting.lastAction?.trim();
  const personalized: SuggestedPrompt[] = [];

  if (action) {
    personalized.push({
      label: 'Pick up my next step',
      prompt: `Let's work on my next step: ${action}.`,
      icon: 'play_arrow',
    });
  } else if (topic) {
    personalized.push({
      label: `Continue: ${topic}`,
      prompt: `Let's keep working on ${topic}.`,
      icon: 'replay',
    });
  }

  const seen = new Set(personalized.map((p) => p.label.toLowerCase()));
  for (const base of BASE_PROMPTS) {
    if (personalized.length >= 5) break;
    if (seen.has(base.label.toLowerCase())) continue;
    personalized.push(base);
    seen.add(base.label.toLowerCase());
  }

  return personalized;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildGreetingText(greeting: CoachChatGreeting): {
  title: string;
  body: string;
  resumePrompt: string | null;
} {
  const name = greeting.firstName?.trim() || 'there';
  if (greeting.returning) {
    const topic = greeting.lastTopic?.trim();
    const action = greeting.lastAction?.trim();
    const title = `Welcome back, ${name}`;
    if (topic) {
      const body = action
        ? `Last time we worked on ${topic}. Your next step was: ${action}. Want to pick up there, or start something new?`
        : `Last time we worked on ${topic}. Want to pick up there, or start something new?`;
      return {
        title,
        body,
        resumePrompt: `Let's pick up where we left off on ${topic}.`,
      };
    }
    return {
      title,
      body: 'Good to see you again. What would you like to work on today?',
      resumePrompt: null,
    };
  }
  return {
    title: `Hi ${name}, I'm your career coach`,
    body: 'I can help with your job search, resumes, interview prep, and career planning. What are you working toward right now?',
    resumePrompt: null,
  };
}

export default function CoachChat({ greeting }: { greeting: CoachChatGreeting }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inputId = useId();
  const { title, body, resumePrompt } = buildGreetingText(greeting);
  const suggestedPrompts = useMemo(() => buildSuggestedPrompts(greeting), [greeting]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, []);

  useEffect(() => {
    autosize();
  }, [draft, autosize]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setError(null);

      // Snapshot history (prior turns only) for the API contract.
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const userMessage: ChatMessage = { id: makeId(), role: 'user', content: trimmed };

      setMessages((prev) => [...prev, userMessage]);
      setDraft('');
      setSending(true);

      try {
        const res = await fetch('/coach/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history }),
        });

        const data = (await res.json().catch(() => ({}))) as ApiResponse;

        if (!res.ok) {
          setError(
            typeof data.error === 'string'
              ? data.error
              : 'Something went wrong. Please try again.'
          );
          return;
        }

        const reply =
          typeof data.reply === 'string' && data.reply.trim()
            ? data.reply.trim()
            : 'I had trouble responding just now. Could you try rephrasing that?';

        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', content: reply },
        ]);
      } catch {
        setError('Network error. Check your connection and try again.');
      } finally {
        setSending(false);
        // Return focus to the input for fast follow-up.
        textareaRef.current?.focus();
      }
    },
    [messages, sending]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void sendMessage(draft);
    },
    [draft, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends; Shift+Enter inserts a newline.
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(draft);
      }
    },
    [draft, sendMessage]
  );

  const handleResume = useCallback(() => {
    if (resumePrompt) void sendMessage(resumePrompt);
  }, [resumePrompt, sendMessage]);

  const handleChip = useCallback(
    (prompt: string) => {
      if (sending) return;
      void sendMessage(prompt);
    },
    [sending, sendMessage]
  );

  // Show the inviting starters until the member begins the conversation.
  const showChips = messages.length === 0 && suggestedPrompts.length > 0;

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <div className={styles.shell}>
      <div className={styles.greeting}>
        <span className={styles.greetingIcon} aria-hidden>
          💬
        </span>
        <div className={styles.greetingBody}>
          <h2 className={styles.greetingTitle}>{title}</h2>
          <p className={styles.greetingText}>{body}</p>
          {resumePrompt ? (
            <button
              type="button"
              className={styles.resumeBtn}
              onClick={handleResume}
              disabled={sending}
            >
              Pick up where we left off
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className={styles.scroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Coaching conversation"
      >
        {messages.length === 0 && !sending ? (
          <p className={styles.empty}>
            Your conversation will appear here. Ask me anything about your career —
            I&apos;ll remember what we discuss for next time.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}
              >
                <div className={styles.bubbleMeta}>{mine ? 'You' : 'Coach'}</div>
                <div className={styles.bubbleBody}>{m.content}</div>
              </div>
            );
          })
        )}

        {sending ? (
          <div className={styles.bubble} aria-label="Coach is typing">
            <div className={styles.bubbleMeta}>Coach</div>
            <div className={styles.typing} aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {showChips ? (
        <div className={styles.chips}>
          <p className={styles.chipsLabel} id={`${inputId}-chips`}>
            Try one of these to get started
          </p>
          <div
            className={styles.chipRow}
            role="group"
            aria-labelledby={`${inputId}-chips`}
          >
            {suggestedPrompts.map((p) => (
              <button
                key={p.label}
                type="button"
                className={styles.chip}
                onClick={() => handleChip(p.prompt)}
                disabled={sending}
                title={p.prompt}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="wa-sr-only">
          Message your career coach
        </label>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            id={inputId}
            className={styles.input}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach anything…"
            maxLength={4000}
            disabled={sending}
            aria-describedby={`${inputId}-hint`}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!canSend}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined" aria-hidden>
              send
            </span>
          </button>
        </div>
        <p id={`${inputId}-hint`} className={styles.hint}>
          Press Enter to send, Shift + Enter for a new line.
        </p>
      </form>
    </div>
  );
}
