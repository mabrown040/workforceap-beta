'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatComposer,
} from '@astryxdesign/core/Chat';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { scrollBehavior } from '@/lib/a11y/scrollBehavior';
import styles from './CoachChat.module.css';

type ChatRole = 'user' | 'assistant';

type CoachMessage = {
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

/**
 * AI career coach chat — presentation runs on the Astryx Chat suite
 * (ChatMessageList/ChatMessage/ChatMessageBubble + ChatComposer) with
 * Markdown-rendered coach replies, an Avatar on assistant messages, Token
 * chips for suggested prompts, and a Spinner typing state. All logic (state,
 * i18n, suggested-prompt personalization, and the POST /coach/chat contract)
 * is unchanged. We keep the page's own scroll container instead of ChatLayout
 * so the coach card's greeting header keeps its existing frame.
 */
export default function CoachChat({ greeting }: { greeting: CoachChatGreeting }) {
  const t = useTranslations('coach');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const inputId = useId();
  const { title, body, resumePrompt } = buildGreetingText(greeting, t);
  const suggestedPrompts = useMemo(() => buildSuggestedPrompts(greeting, t), [greeting, t]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setError(null);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const userMessage: CoachMessage = { id: makeId(), role: 'user', content: trimmed };

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
          setError(typeof data.error === 'string' ? data.error : t('error.generic'));
          return;
        }

        const reply =
          typeof data.reply === 'string' && data.reply.trim()
            ? data.reply.trim()
            : t('error.noReply');

        setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: reply }]);
      } catch {
        setError(t('error.network'));
      } finally {
        setSending(false);
      }
    },
    [messages, sending, t]
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

  return (
    <div className={styles.shell}>
      <div className={styles.greeting}>
        <span className={styles.greetingIcon} aria-hidden>
          <span className="material-symbols-outlined">forum</span>
        </span>
        <div className={styles.greetingBody}>
          <h2 className={styles.greetingTitle}>{title}</h2>
          <p className={styles.greetingText}>{body}</p>
          {resumePrompt ? (
            <Button label={t('chat.resumeButton')} variant="secondary" size="sm" onClick={handleResume} isDisabled={sending} />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={styles.scroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('chat.conversationAria')}
      >
        <ChatMessageList
          density="balanced"
          isStreaming={sending}
          emptyState={!sending ? <p className={styles.empty}>{t('chat.empty')}</p> : undefined}
        >
          {messages.map((m) =>
            m.role === 'user' ? (
              <ChatMessage key={m.id} sender="user">
                <ChatMessageBubble>{m.content}</ChatMessageBubble>
              </ChatMessage>
            ) : (
              <ChatMessage
                key={m.id}
                sender="assistant"
                avatar={<Avatar name={t('chat.coach')} size="small" />}
                name={t('chat.coach')}
              >
                <Markdown density="compact" headingLevelStart={3}>
                  {m.content}
                </Markdown>
              </ChatMessage>
            )
          )}
          {sending ? (
            <ChatMessage
              sender="assistant"
              avatar={<Avatar name={t('chat.coach')} size="small" />}
              name={t('chat.coach')}
            >
              <Spinner size="sm" aria-label={t('chat.typingAria')} />
            </ChatMessage>
          ) : null}
        </ChatMessageList>
        <div ref={bottomRef} />
      </div>

      {showChips ? (
        <div className={styles.chips}>
          <p className={styles.chipsLabel} id={`${inputId}-chips`}>
            {t('chat.chipsLabel')}
          </p>
          <div className={styles.chipRow} role="group" aria-labelledby={`${inputId}-chips`}>
            {suggestedPrompts.map((p) => (
              <Token
                key={p.label}
                label={p.label}
                size="lg"
                isDisabled={sending}
                onClick={() => handleChip(p.prompt)}
                description={p.prompt}
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
                    {p.icon}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSubmit={(value) => void sendMessage(value)}
        isDisabled={sending}
        placeholder={t('chat.placeholder')}
        density="compact"
      />
      <p className={styles.hint}>{t('chat.hint')}</p>
    </div>
  );
}
