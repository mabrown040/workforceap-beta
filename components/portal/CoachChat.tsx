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
import { useTranslations } from 'next-intl';
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

type CoachTranslator = ReturnType<typeof useTranslations<'coach'>>;

const BASE_PROMPT_KEYS = [
  { labelKey: 'prompts.improveResumeLabel', promptKey: 'prompts.improveResumePrompt', icon: 'description' },
  { labelKey: 'prompts.nextStepLabel', promptKey: 'prompts.nextStepPrompt', icon: 'flag' },
  { labelKey: 'prompts.practiceInterviewLabel', promptKey: 'prompts.practiceInterviewPrompt', icon: 'forum' },
  { labelKey: 'prompts.employmentGapLabel', promptKey: 'prompts.employmentGapPrompt', icon: 'schedule' },
  { labelKey: 'prompts.findJobsLabel', promptKey: 'prompts.findJobsPrompt', icon: 'work' },
] as const;

/**
 * Build up to five suggested prompts, personalizing the lead chip from the
 * greeting data already on hand. Purely client-side — no extra server calls.
 */
function buildSuggestedPrompts(greeting: CoachChatGreeting, t: CoachTranslator): SuggestedPrompt[] {
  const topic = greeting.lastTopic?.trim();
  const action = greeting.lastAction?.trim();
  const personalized: SuggestedPrompt[] = [];

  if (action) {
    personalized.push({
      label: t('prompts.pickUpNextStepLabel'),
      prompt: t('prompts.pickUpNextStepPrompt', { action }),
      icon: 'play_arrow',
    });
  } else if (topic) {
    personalized.push({
      label: t('prompts.continueTopicLabel', { topic }),
      prompt: t('prompts.continueTopicPrompt', { topic }),
      icon: 'replay',
    });
  }

  const seen = new Set(personalized.map((p) => p.label.toLowerCase()));
  for (const base of BASE_PROMPT_KEYS) {
    if (personalized.length >= 5) break;
    const label = t(base.labelKey);
    if (seen.has(label.toLowerCase())) continue;
    personalized.push({ label, prompt: t(base.promptKey), icon: base.icon });
    seen.add(label.toLowerCase());
  }

  return personalized;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildGreetingText(
  greeting: CoachChatGreeting,
  t: CoachTranslator,
): {
  title: string;
  body: string;
  resumePrompt: string | null;
} {
  const name = greeting.firstName?.trim() || t('greeting.defaultName');
  if (greeting.returning) {
    const topic = greeting.lastTopic?.trim();
    const action = greeting.lastAction?.trim();
    const title = t('greeting.welcomeBack', { name });
    if (topic) {
      const body = action
        ? t('greeting.lastTopicWithAction', { topic, action })
        : t('greeting.lastTopicOnly', { topic });
      return {
        title,
        body,
        resumePrompt: t('greeting.resumePrompt', { topic }),
      };
    }
    return {
      title,
      body: t('greeting.returningDefault'),
      resumePrompt: null,
    };
  }
  return {
    title: t('greeting.newTitle', { name }),
    body: t('greeting.newBody'),
    resumePrompt: null,
  };
}

export default function CoachChat({ greeting }: { greeting: CoachChatGreeting }) {
  const t = useTranslations('coach');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inputId = useId();
  const { title, body, resumePrompt } = buildGreetingText(greeting, t);
  const suggestedPrompts = useMemo(() => buildSuggestedPrompts(greeting, t), [greeting, t]);

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
              : t('error.generic')
          );
          return;
        }

        const reply =
          typeof data.reply === 'string' && data.reply.trim()
            ? data.reply.trim()
            : t('error.noReply');

        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', content: reply },
        ]);
      } catch {
        setError(t('error.network'));
      } finally {
        setSending(false);
        textareaRef.current?.focus();
      }
    },
    [messages, sending, t]
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
              {t('chat.resumeButton')}
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
        aria-label={t('chat.conversationAria')}
      >
        {messages.length === 0 && !sending ? (
          <p className={styles.empty}>
            {t('chat.empty')}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}
              >
                <div className={styles.bubbleMeta}>{mine ? t('chat.you') : t('chat.coach')}</div>
                <div className={styles.bubbleBody}>{m.content}</div>
              </div>
            );
          })
        )}

        {sending ? (
          <div className={styles.bubble} aria-label={t('chat.typingAria')}>
            <div className={styles.bubbleMeta}>{t('chat.coach')}</div>
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
            {t('chat.chipsLabel')}
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
          {t('chat.inputLabel')}
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
            placeholder={t('chat.placeholder')}
            maxLength={4000}
            disabled={sending}
            aria-describedby={`${inputId}-hint`}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!canSend}
            aria-label={t('chat.sendAria')}
          >
            <span className="material-symbols-outlined" aria-hidden>
              send
            </span>
          </button>
        </div>
        <p id={`${inputId}-hint`} className={styles.hint}>
          {t('chat.hint')}
        </p>
      </form>
    </div>
  );
}
