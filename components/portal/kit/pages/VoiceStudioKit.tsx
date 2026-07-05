'use client';

/**
 * VoiceStudioKit — Voice AI + Career Studio (HIGHEST-PRIORITY page).
 *
 * Faithful port of docs/mockups/workforceap-voice-studio.html onto the portal
 * design kit (warm surface + tokens + wa-kit-* + wa- utilities + lucide icons).
 *
 * Four tabs, switched in local state:
 *   coaches  → Voice Coaches hub        (default)
 *   session  → Live Voice Session       (dark panel, animated mic orb)
 *   studio   → Resume Studio · Beta     (Career Studio: score + issues + rewrite)
 *   toolkit  → AI Career Toolkit        (3 numbered steps of tool cards)
 *
 * The "Mock Interview" coach card and the Live Session tab button both switch to
 * the `session` tab. Dark panels (#1a1a1a / #0f0f10) are intentional and use
 * inline backgrounds — the kit's warm surface is light.
 *
 * Animations (orb pulse, expanding rings, equalizer) are gated behind
 * prefers-reduced-motion: reduce. Focus rings use wa-kit-focus where on light
 * backgrounds; dark panels use a self-contained dark focus ring class.
 *
 * Spec: docs/PORTING_GUIDE.md
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  AudioLines,
  Sparkles,
  Target,
  Headphones,
  Headset,
  Briefcase,
  Zap,
  FileText,
  MailOpen,
  CheckCircle2,
  Search,
  Network,
  Route,
  Linkedin,
  UserPen,
  MessagesSquare,
  Scale,
  Clock,
  PhoneOff,
  Captions,
  ArrowRight,
  Upload,
  Play,
  Circle,
  FlaskConical,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import type { Conversation } from '@elevenlabs/client';
import { DesignSurface } from '../DesignSurface';
import { VoiceOrb } from '../VoiceOrb';

type StudioTab = 'coaches' | 'session' | 'studio' | 'toolkit';
export type VoiceStudioAgentKey = 'readiness' | 'resume' | 'mock' | 'counselor' | 'business';
export const VOICE_STUDIO_AGENT_KEYS: VoiceStudioAgentKey[] = ['readiness', 'resume', 'mock', 'counselor', 'business'];

/**
 * Config for a voice agent that the Live Session tab can run. Each voice coach
 * card picks one of these and switches to the session tab, so every agent uses
 * the same live-session experience instead of navigating to a separate page.
 */
export type SessionAgentConfig = {
  label: string;
  /** POST endpoint that mints the ElevenLabs signed URL. */
  endpoint: string;
  /** JSON body for the endpoint (e.g. interview role/type). */
  payload?: Record<string, unknown>;
  accent: string;
  accentDark: string;
  /**
   * When true, the idle state asks the member for a target role + interview
   * type before starting (used by Mock Interview), and merges them into the
   * POST payload as `{ role, interviewType }`.
   */
  askRole?: boolean;
};

const AGENT_ACCENT = {
  crimson: { accent: 'var(--wa-accent)', accentDark: 'var(--wa-accent-dark)' },
  gold: { accent: 'var(--wa-gold)', accentDark: 'var(--wa-gold-dark)' },
  blue: { accent: 'var(--wa-info)', accentDark: 'color-mix(in srgb, var(--wa-info) 75%, black)' },
} as const;

const SESSION_AGENTS: Record<VoiceStudioAgentKey, SessionAgentConfig> = {
  readiness: { label: 'Readiness Coach', endpoint: '/api/member/readiness/voice-session', ...AGENT_ACCENT.gold },
  resume: { label: 'Resume Coach', endpoint: '/api/member/resume-coach/session', ...AGENT_ACCENT.crimson },
  mock: {
    label: 'Mock Interview',
    endpoint: '/api/interview/session',
    payload: { interviewType: 'behavioral' },
    askRole: true,
    ...AGENT_ACCENT.crimson,
  },
  counselor: { label: 'Career Counselor', endpoint: '/api/counselor/session', ...AGENT_ACCENT.blue },
  business: { label: 'Career & Business Coach', endpoint: '/api/member/career-business-coach/voice-session', ...AGENT_ACCENT.crimson },
};

/**
 * Real routes each card opens. Most live under /dashboard/ai-tools/*; the
 * counselor has its own top-level route. Keyed by a stable string so card data
 * can reference a route without repeating the literal path.
 */
const TOOL_HREF = {
  'readiness-coach': '/dashboard/ai-tools/readiness-coach',
  'resume-coach': '/dashboard/ai-tools/resume-coach',
  counselor: '/dashboard/counselor',
  'career-business-coach': '/dashboard/ai-tools/career-business-coach',
  'elevator-pitch': '/dashboard/ai-tools/elevator-pitch',
  'resume-studio': '/dashboard/ai-tools/resume-studio',
  'resume-rewriter': '/dashboard/ai-tools/resume-rewriter',
  'cover-letter': '/dashboard/ai-tools/cover-letter',
  'skill-checkpoints': '/dashboard/ai-tools/skill-checkpoints',
  'interview-practice': '/dashboard/ai-tools/interview-practice',
  'interview-coach': '/dashboard/ai-tools/interview-coach',
  'job-match-scorer': '/dashboard/ai-tools/job-match-scorer',
  'skill-mapper': '/dashboard/ai-tools/skill-mapper',
  'training-bridge': '/dashboard/ai-tools/training-bridge',
  'linkedin-headline': '/dashboard/ai-tools/linkedin-headline',
  'linkedin-about': '/dashboard/ai-tools/linkedin-about',
  'gap-analyzer': '/dashboard/ai-tools/gap-analyzer',
  'salary-negotiation': '/dashboard/ai-tools/salary-negotiation',
  'benefits-cliff': '/dashboard/ai-tools/benefits-cliff',
} as const;

const TABS: Array<{ id: StudioTab; label: string }> = [
  { id: 'coaches', label: 'Coaches' },
  { id: 'session', label: 'Live' },
  { id: 'studio', label: 'Resume' },
  { id: 'toolkit', label: 'Toolkit' },
];

/** Real, instant structural-read data for the Resume Studio tab. */
export type ResumeStudioIssue = { title: string; detail: string };
export type ResumeStudioData = {
  /** Whether the member has a resume on file. */
  hasResume: boolean;
  /** Deterministic structural score 0–100 (instant; not the full AI composite). */
  structuralScore?: number;
  /** Real issues derived from the weakest structural dimensions. */
  issues?: ResumeStudioIssue[];
};

export interface VoiceStudioKitProps {
  /** Which tab to show first. */
  initialTab?: StudioTab;
  /**
   * Real resume data for the Resume Studio tab, computed server-side from the
   * member's actual resume (deterministic structural read — no fabricated data).
   */
  resumeStudio?: ResumeStudioData;
  /**
   * POST endpoint the Live Session tab calls to mint an ElevenLabs signed URL.
   * Defaults to the mock-interview agent endpoint.
   */
  sessionEndpoint?: string;
  /** JSON body posted to `sessionEndpoint` (e.g. interview role + type). */
  sessionPayload?: Record<string, unknown>;
  /** Which voice coach to preselect when deep-linking to the Live tab. */
  initialAgent?: VoiceStudioAgentKey;
}

export function VoiceStudioKit({
  initialTab = 'coaches',
  resumeStudio = { hasResume: false },
  sessionEndpoint = '/api/interview/session',
  sessionPayload = { role: 'a general professional role', interviewType: 'behavioral' },
  initialAgent,
}: VoiceStudioKitProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const fallbackAgent: SessionAgentConfig = {
    label: 'Mock Interview',
    endpoint: sessionEndpoint,
    payload: sessionPayload,
    askRole: true,
    ...AGENT_ACCENT.crimson,
  };
  const [agent, setAgent] = useState<SessionAgentConfig>(
    initialAgent ? SESSION_AGENTS[initialAgent] : fallbackAgent,
  );

  const pickAgent = (next: SessionAgentConfig) => {
    setAgent(next);
    setTab('session');
  };

  // Roving-tabindex keyboard nav for the custom tablist (WAI-ARIA tabs
  // pattern): arrow keys move focus AND activate the tab; Home/End jump to
  // the ends. Mirrors the existing click-to-activate behavior.
  const focusTabAt = (index: number) => {
    const count = TABS.length;
    const next = ((index % count) + count) % count;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusTabAt(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusTabAt(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTabAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTabAt(TABS.length - 1);
    }
  };

  return (
    <DesignSurface surface="warm">
      <style>{ORB_CSS}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--wa-bg)', color: 'var(--wa-text)' }}>
        {/* ============ STICKY DARK HEADER + TABS ============ */}
        <header
          style={{
            position: 'sticky',
            top: 'calc(var(--workspace-header-h, 3.25rem) + var(--member-portal-top-nav-h, 0px))',
            zIndex: 25,
            background: '#1a1a1a',
            color: '#fff',
          }}
        >
          <div
            className="wa-flex wa-flex-col lg:wa-flex-row"
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: 'var(--wa-accent)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AudioLines size={16} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>Voice + Career Studio</div>
                <div style={{ fontSize: 10, color: '#a3a3a3' }}>
                  Voice coaching, resume tools, and interview prep in one place.
                </div>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Voice studio sections"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                scrollSnapType: 'x proximity',
                overscrollBehaviorX: 'contain',
                touchAction: 'pan-x',
                background: '#262626',
                borderRadius: 12,
                padding: 4,
                border: '1px solid #404040',
                maxWidth: '100%',
              }}
            >
              {TABS.map((t, i) => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    id={`vs-tab-${t.id}`}
                    role="tab"
                    aria-selected={on}
                    aria-controls={`vs-panel-${t.id}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, i)}
                    className={`wa-kit-focus${on ? '' : ' vs-tab-btn'}`}
                    style={{
                      minHeight: 44,
                      padding: '8px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: on ? 'var(--wa-accent)' : 'transparent',
                      color: on ? 'var(--wa-on-accent)' : '#a3a3a3',
                      whiteSpace: 'nowrap',
                      flex: '0 0 auto',
                      scrollSnapAlign: 'start',
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main
          style={{
            flexGrow: 1,
            width: '100%',
            maxWidth: 1280,
            margin: '0 auto',
            padding: 16,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h1 className="sr-only">Voice and Career Studio</h1>
          <div
            role="tabpanel"
            id={`vs-panel-${tab}`}
            aria-labelledby={`vs-tab-${tab}`}
            tabIndex={0}
            className="wa-kit-focus"
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {tab === 'coaches' && <CoachesPanel onPick={pickAgent} />}
            {tab === 'session' && <SessionPanel agent={agent} />}
            {tab === 'studio' && (
              <StudioPanel data={resumeStudio} />
            )}
            {tab === 'toolkit' && <ToolkitPanel />}
          </div>
        </main>

        <footer style={{ background: '#1a1a1a', color: '#737373', fontSize: 10, textAlign: 'center', padding: '12px 16px' }}>
          Built for focused practice, clearer next steps, and staff-supported career momentum
        </footer>
      </div>
    </DesignSurface>
  );
}

/* ============================================================ */
/* VIEW: VOICE COACHES HUB                                       */
/* ============================================================ */

interface CoachCard {
  key: string;
  variant: 'gold' | 'crimson' | 'crimson-deep' | 'counselor' | 'dark' | 'gold-light';
  Icon: LucideIcon;
  badge: string;
  title: string;
  body: string;
  ctaIcon: LucideIcon;
  cta: string;
  /** Real route this card opens (non-voice cards, e.g. the elevator builder). */
  href?: string;
  /** Voice agent this card runs — clicking opens the in-page Live Session tab. */
  agent?: SessionAgentConfig;
}

const COACH_CARDS: CoachCard[] = [
  {
    key: 'readiness',
    variant: 'gold',
    Icon: Target,
    badge: 'READINESS',
    title: 'Readiness Coach',
    body: 'Interviews, certifications, and next steps — talked through out loud.',
    ctaIcon: Mic,
    cta: 'Start session',
    agent: SESSION_AGENTS.readiness,
  },
  {
    key: 'resume',
    variant: 'crimson',
    Icon: Sparkles,
    badge: 'RESUME',
    title: 'Resume Coach',
    body: 'Voice feedback on your bullets and framing. Pairs with your live draft.',
    ctaIcon: Mic,
    cta: 'Start session',
    agent: SESSION_AGENTS.resume,
  },
  {
    key: 'mock',
    variant: 'crimson-deep',
    Icon: AudioLines,
    badge: 'PRACTICE',
    title: 'Mock Interview',
    body: 'Answer out loud to realistic interview questions, then review your transcript.',
    ctaIcon: Play,
    cta: 'Start practice',
    agent: SESSION_AGENTS.mock,
  },
  {
    key: 'counselor',
    variant: 'counselor',
    Icon: Headphones,
    badge: 'COUNSELOR',
    title: 'Career Counselor',
    body: 'Private voice session — then your personalized action plan.',
    ctaIcon: Mic,
    cta: 'Start session',
    agent: SESSION_AGENTS.counselor,
  },
  {
    key: 'business',
    variant: 'crimson',
    Icon: Briefcase,
    badge: 'ADVANCED',
    title: 'Career & Business Coach',
    body: 'Broader career, PM, sales, marketing and business guidance.',
    ctaIcon: Mic,
    cta: 'Start session',
    agent: SESSION_AGENTS.business,
  },
  {
    key: 'elevator',
    variant: 'gold-light',
    Icon: Zap,
    badge: '10–20 SEC',
    title: 'Elevator Introduction',
    body: 'Generate a sharp intro, save it, then rehearse it on camera.',
    ctaIcon: ArrowRight,
    cta: 'Build intro',
    href: TOOL_HREF['elevator-pitch'],
  },
];

function CoachesPanel({ onPick }: { onPick: (agent: SessionAgentConfig) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        className="wa-flex-col md:wa-flex-row"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--wa-accent)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <Headset size={13} aria-hidden="true" />
            <span>Talk it out</span>
          </div>
          <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Voice Coaches
          </h2>
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
            Real-time spoken coaching. Your program context is included automatically.
          </p>
        </div>
        <div
          style={{
            padding: '6px 12px',
            background: 'var(--wa-surface)',
            border: '1px solid var(--wa-border)',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Circle size={7} fill="var(--wa-success)" color="var(--wa-success)" aria-hidden="true" />
          Live voice · ~5 min
        </div>
      </div>

      <div
        style={{
          background: 'var(--wa-surface)',
          border: '1px solid var(--wa-border)',
          borderRadius: 16,
          padding: '12px 16px',
          fontSize: 12,
          color: 'var(--wa-muted)',
        }}
      >
        <strong style={{ color: 'var(--wa-text)' }}>Pick a coach for what you need right now.</strong>{' '}
        Each live session uses your program context automatically, so you can talk through next steps without setup.
      </div>

      <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-5">
        {COACH_CARDS.map((c) => (
          <CoachCardView key={c.key} card={c} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

function CoachCardView({ card, onPick }: { card: CoachCard; onPick: (agent: SessionAgentConfig) => void }) {
  const { variant, Icon, badge, title, body, ctaIcon: Cta, cta } = card;

  // Per-variant styling roles, pulled from the mockup.
  const isLightBody = variant === 'counselor' || variant === 'gold-light';
  let cardStyle: React.CSSProperties;
  let iconChip: React.CSSProperties;
  let badgeStyle: React.CSSProperties;
  let bodyColor: string;
  let ctaColor: string | undefined;

  switch (variant) {
    case 'gold':
      cardStyle = { background: 'linear-gradient(to bottom right, var(--wa-gold), var(--wa-gold-dark))', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 15px -3px rgba(120,93,38,0.15)' };
      iconChip = { background: 'rgba(255,255,255,0.22)' };
      badgeStyle = { background: 'rgba(255,255,255,0.28)' };
      bodyColor = 'rgba(255,255,255,0.92)';
      ctaColor = undefined;
      break;
    case 'crimson':
      cardStyle = { background: 'linear-gradient(to bottom right, var(--wa-accent), var(--wa-accent-dark))', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 15px -3px rgba(120,20,38,0.15)' };
      iconChip = { background: 'rgba(255,255,255,0.22)' };
      badgeStyle = { background: 'rgba(255,255,255,0.28)' };
      bodyColor = 'rgba(255,255,255,0.92)';
      break;
    case 'crimson-deep':
      cardStyle = { background: 'linear-gradient(to bottom right, var(--wa-accent-dark), color-mix(in srgb, var(--wa-accent-dark) 70%, black))', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 15px -3px rgba(120,20,38,0.15)' };
      iconChip = { background: 'rgba(255,255,255,0.22)' };
      badgeStyle = { background: 'rgba(255,255,255,0.28)' };
      bodyColor = 'rgba(255,255,255,0.92)';
      break;
    case 'counselor':
      cardStyle = { background: 'var(--wa-surface)', border: '1px solid var(--wa-border)', color: 'var(--wa-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
      iconChip = { background: 'var(--wa-info-soft)', color: 'var(--wa-info)', border: '1px solid var(--wa-border)' };
      badgeStyle = { background: 'var(--wa-info-soft)', color: 'var(--wa-info)' };
      bodyColor = 'var(--wa-muted)';
      ctaColor = 'var(--wa-info)';
      break;
    case 'dark':
      cardStyle = { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' };
      iconChip = { background: 'var(--wa-accent)' };
      badgeStyle = { background: 'rgba(255,255,255,0.18)' };
      bodyColor = 'rgba(255,255,255,0.9)';
      break;
    case 'gold-light':
    default:
      // Use theme tokens only (no hardcoded cream) so the card flips in dark
      // mode — the previous hardcoded #faf7f0 bg + flipping text tokens made
      // this card unreadable in dark. CTA uses --wa-text for guaranteed AA;
      // the gold identity carries through the icon chip + badge.
      cardStyle = { background: 'var(--wa-gold-soft)', border: '1px solid var(--wa-border)', color: 'var(--wa-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
      iconChip = { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)', border: '1px solid var(--wa-border)' };
      badgeStyle = { background: 'var(--wa-surface)', color: 'var(--wa-gold)' };
      bodyColor = 'var(--wa-muted)';
      ctaColor = 'var(--wa-text)';
      break;
  }

  const sharedStyle: React.CSSProperties = {
    textAlign: 'left',
    borderRadius: 24,
    padding: 'clamp(20px, 5vw, 28px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    minHeight: 210,
    border: 'none',
    ...cardStyle,
  };

  const inner = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ padding: 12, borderRadius: 16, display: 'inline-flex', ...iconChip }}>
          <Icon size={20} aria-hidden="true" />
        </div>
        <span
          style={{
            padding: '3px 11px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            borderRadius: 999,
            ...badgeStyle,
          }}
        >
          {badge}
        </span>
      </div>
      <div>
        <h3 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ fontSize: 13.5, color: bodyColor, marginTop: 6, lineHeight: 1.5 }}>{body}</p>
        <div
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: ctaColor ?? (isLightBody ? 'var(--wa-text)' : '#fff'),
          }}
        >
          <Cta size={13} aria-hidden="true" />
          {cta}
        </div>
      </div>
    </>
  );

  // Voice coaches open the in-page Live Session tab with their own agent;
  // non-voice cards (the elevator builder) still navigate via a real route.
  if (card.agent) {
    const agent = card.agent;
    return (
      <button type="button" onClick={() => onPick(agent)} className="wa-kit-focus vs-hero-card" style={sharedStyle}>
        {inner}
      </button>
    );
  }
  if (card.href) {
    return (
      <Link href={card.href} className="wa-kit-focus vs-hero-card" style={{ ...sharedStyle, textDecoration: 'none' }}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="wa-kit-focus vs-hero-card" style={sharedStyle}>
      {inner}
    </div>
  );
}

/* ============================================================ */
/* VIEW: LIVE VOICE SESSION                                      */
/* ============================================================ */

type SessionPhase = 'idle' | 'connecting' | 'active' | 'ended';
type TranscriptLine = { speaker: 'agent' | 'user'; text: string };

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Live Voice Session — a REAL ElevenLabs conversation (mints a signed URL from
 * `agent.endpoint`, then runs `Conversation.startSession`). Every voice coach
 * routes through this one panel, so the experience is identical across agents;
 * the audio-reactive orb, timer, transcript, mute and end are all driven by the
 * live session, not canned content.
 */
function SessionPanel({ agent }: { agent: SessionAgentConfig }) {
  const { label, endpoint, payload, accent, accentDark, askRole } = agent;
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [error, setError] = useState('');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState('behavioral');

  const convRef = useRef<Conversation | null>(null);
  const intentionalRef = useRef(false);
  const phaseRef = useRef<SessionPhase>('idle');
  const startedAtRef = useRef<number | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  const userTurns = lines.filter((l) => l.speaker === 'user').length;
  const isLive = phase === 'active';

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Running clock — real elapsed time, only while the session is active.
  useEffect(() => {
    if (phase !== 'active') {
      if (phase === 'idle') setElapsed(0);
      return;
    }
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Auto-follow the transcript as new lines arrive.
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // End any live session if the user leaves the tab/page.
  useEffect(() => {
    return () => {
      intentionalRef.current = true;
      convRef.current?.endSession();
    };
  }, []);

  const start = useCallback(async () => {
    setError('');
    setLines([]);
    intentionalRef.current = false;
    setPhase('connecting');

    // Mic probe first — keeps the permission prompt tied to the click.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError('Microphone access is required. Allow it in your browser and try again.');
      setPhase('idle');
      return;
    }

    let signedUrl: string;
    let dynamicVariables: Record<string, string | number | boolean> | undefined;
    try {
      const effectivePayload = askRole
        ? { ...(payload ?? {}), role: role.trim() || 'a general professional role', interviewType }
        : payload ?? {};
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(effectivePayload),
      });
      const data = (await res.json()) as {
        signedUrl?: string;
        dynamicVariables?: Record<string, string | number | boolean>;
        error?: string;
      };
      if (!res.ok || !data.signedUrl) {
        throw new Error(data.error ?? 'Voice sessions are not available right now.');
      }
      signedUrl = data.signedUrl;
      dynamicVariables = data.dynamicVariables;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the session.');
      setPhase('idle');
      return;
    }

    const callbacks = {
      onConnect: () => setPhase('active'),
      onDisconnect: (details: unknown) => {
        const intentional = intentionalRef.current;
        intentionalRef.current = false;
        setAgentSpeaking(false);
        if (!intentional && phaseRef.current === 'connecting') {
          const reason = (details as { message?: string } | undefined)?.message;
          setError(reason || 'Connection lost before the session started. Please try again.');
          setPhase('idle');
        } else {
          setPhase('ended');
        }
      },
      onMessage: (event: unknown) => {
        const ev = event as Record<string, unknown>;
        const rawText =
          typeof ev.message === 'string'
            ? ev.message
            : typeof ev.text === 'string'
              ? ev.text
              : '';
        const text = rawText.trim();
        if (!text) return;
        const isAgent = ev.role === 'agent' || ev.source === 'ai' || ev.type === 'agent_response';
        const isUser = ev.role === 'user' || ev.source === 'user' || ev.type === 'user_transcript';
        if (isAgent) {
          setAgentSpeaking(true);
          setLines((prev) => [...prev, { speaker: 'agent', text }]);
        } else if (isUser) {
          setAgentSpeaking(false);
          setLines((prev) => [...prev, { speaker: 'user', text }]);
        }
      },
      onError: (msg: unknown) => {
        setError(typeof msg === 'string' && msg ? msg : 'Connection error. Please try again.');
        setPhase('idle');
      },
    };

    try {
      const { Conversation: ConversationClient } = await import('@elevenlabs/client');
      const hasVars = Boolean(dynamicVariables && Object.keys(dynamicVariables).length > 0);
      if (hasVars) {
        try {
          convRef.current = await ConversationClient.startSession({ signedUrl, dynamicVariables, ...callbacks });
        } catch {
          // Retry once without dynamic variables (agent may not declare them).
          convRef.current = await ConversationClient.startSession({ signedUrl, ...callbacks });
        }
      } else {
        convRef.current = await ConversationClient.startSession({ signedUrl, ...callbacks });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice session failed to start.');
      setPhase('idle');
    }
  }, [endpoint, payload, askRole, role, interviewType]);

  // Live audio level (0..1) for the reactive orb — max of mic + agent volume.
  const getLevel = useCallback(() => {
    const c = convRef.current;
    if (!c) return 0;
    try {
      const input = typeof c.getInputVolume === 'function' ? c.getInputVolume() : 0;
      const output = typeof c.getOutputVolume === 'function' ? c.getOutputVolume() : 0;
      return Math.max(input || 0, output || 0);
    } catch {
      return 0;
    }
  }, []);

  const end = useCallback(() => {
    intentionalRef.current = true;
    convRef.current?.endSession();
    setAgentSpeaking(false);
    setPhase('ended');
  }, []);

  const reset = useCallback(() => {
    intentionalRef.current = true;
    convRef.current?.endSession();
    convRef.current = null;
    setPhase('idle');
    setError('');
    setLines([]);
    setMuted(false);
    setAgentSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        convRef.current?.setMicMuted(next);
      } catch {
        /* ignore — mute is best-effort */
      }
      return next;
    });
  }, []);

  // Status line (top-left of the orb panel).
  const status =
    phase === 'active'
      ? `Connected · ${label}`
      : phase === 'connecting'
        ? 'Connecting…'
        : phase === 'ended'
          ? 'Session ended'
          : `Ready · ${label}`;
  const dotColor = phase === 'active' ? 'var(--wa-success)' : phase === 'connecting' ? 'var(--wa-gold)' : 'rgba(255,255,255,0.4)';

  // Big status caption under the orb.
  const caption =
    phase === 'active'
      ? agentSpeaking
        ? `${label} is speaking…`
        : 'Listening — speak when ready'
      : phase === 'connecting'
        ? 'Connecting to your coach…'
        : phase === 'ended'
          ? 'Session ended'
          : `Start a live session with the ${label}`;
  const subCaption =
    phase === 'active'
      ? muted
        ? 'Microphone muted — tap the mic to unmute'
        : 'Answer out loud — the live transcript appears on this page'
      : phase === 'ended'
        ? 'Review the transcript below, then run another round when you are ready.'
        : phase === 'idle'
          ? 'Real-time voice coaching. Microphone required.'
          : 'Checking your microphone and connecting to your coach…';

  return (
    // flex-start (not center): centering split the leftover height into a
    // large dead band ABOVE the section title; anchoring to the top with the
    // tall clamped stage reads intentional and keeps the heading scannable.
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 8, gap: 16 }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--wa-accent)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <Headset size={13} aria-hidden="true" />
          <span>Live session</span>
        </div>
        <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em' }}>
          {label}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
          Real-time spoken coaching — your program context is included automatically.
        </p>
      </div>

      {/* Dark "stage" — an intentional, always-dark media surface (like a call/theater
          screen) rather than a page-theme surface, framed in a themed bezel so it
          reads as deliberate in both light and dark mode instead of a stray black box. */}
      <div
        style={{
          background: 'var(--wa-surface)',
          border: '1px solid var(--wa-border)',
          borderRadius: 28,
          padding: 6,
          boxShadow: 'var(--wa-shadow-lg)',
        }}
      >
        <div style={{ background: '#1a1a1a', borderRadius: 22, overflow: 'hidden' }}>
          <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-5" style={{ minHeight: 'clamp(560px, 60vh, 720px)' }}>
          {/* Orb / status — spans 3 of 5 on lg */}
          <div
            className="lg:wa-col-span-3"
            style={{
              padding: 'clamp(20px, 5vw, 32px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700 }}>
              <span aria-hidden="true" className={isLive ? 'vs-dot' : undefined} style={{ width: 8, height: 8, borderRadius: 999, background: dotColor }} />
              {status}
            </div>
            <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              <Clock size={13} aria-hidden="true" />
              {formatClock(elapsed)}
            </div>

            {/* audio-reactive orb — core scale + rings track live mic/agent volume */}
            <div style={{ margin: '20px 0' }}>
              <VoiceOrb
                getLevel={getLevel}
                active={isLive}
                muted={muted}
                connecting={phase === 'connecting'}
                accent={accent}
                accentDark={accentDark}
                size={168}
              />
            </div>

            {/* equalizer — only while the coach is actively speaking */}
            {isLive && agentSpeaking ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32, marginBottom: 12 }}>
                {[0, 0.15, 0.3, 0.1, 0.25].map((delay, i) => (
                  <span
                    key={i}
                    className="vs-eqbar"
                    style={{ width: 4, background: accent, borderRadius: 999, animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ height: 32, marginBottom: 12 }} aria-hidden />
            )}

            <p style={{ fontSize: 14, fontWeight: 600 }}>{caption}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center', maxWidth: 320 }}>{subCaption}</p>

            {error ? (
              <div
                role="alert"
                style={{
                  marginTop: 16,
                  maxWidth: 360,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  background: 'rgba(173,44,77,0.15)',
                  border: '1px solid rgba(173,44,77,0.4)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#f0a9b8',
                  textAlign: 'left',
                }}
              >
                <AlertTriangle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            ) : null}

            {/* role picker — only for agents that ask (Mock Interview), before start */}
            {phase === 'idle' && askRole ? (
              <div style={{ width: '100%', maxWidth: 360, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                    Target role
                  </span>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Cloud Support Associate"
                    className="vs-focus-dark"
                    style={{
                      background: '#0f0f10',
                      border: '1px solid #404040',
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: 14,
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                    Interview type
                  </span>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="vs-focus-dark"
                    style={{
                      background: '#0f0f10',
                      border: '1px solid #404040',
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="behavioral">Behavioral</option>
                    <option value="technical">Technical</option>
                    <option value="general">General / screening</option>
                  </select>
                </label>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  Leave the role blank for a general practice interview.
                </p>
              </div>
            ) : null}

            {/* controls — real start / mute / end depending on phase */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
              {phase === 'active' ? (
                <>
                  <button
                    type="button"
                    className="vs-focus-dark vs-btn-solid"
                    aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                    aria-pressed={muted}
                    title={muted ? 'Unmute microphone' : 'Mute microphone'}
                    onClick={toggleMute}
                    style={{ ...circleBtn, background: muted ? accent : 'rgba(255,255,255,0.1)' }}
                  >
                    {muted ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    className="vs-focus-dark vs-btn-solid"
                    onClick={end}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 999,
                      background: accent,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <PhoneOff size={15} aria-hidden="true" />
                    End Session
                  </button>
                </>
              ) : phase === 'connecting' ? (
                <button
                  type="button"
                  className="vs-focus-dark"
                  disabled
                  style={{
                    padding: '12px 28px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'wait',
                    opacity: 0.7,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span className="vs-dot" style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} />
                  Connecting…
                </button>
              ) : (
                <button
                  type="button"
                  className="vs-focus-dark vs-btn-solid"
                  onClick={() => void start()}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 999,
                    background: accent,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {phase === 'ended' ? <Play size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
                  {phase === 'ended' ? 'Start again' : 'Start session'}
                </button>
              )}
            </div>
          </div>

          {/* live transcript — spans 2 of 5 on lg */}
          <div
            className="lg:wa-col-span-2"
            style={{
              background: '#0f0f10',
              borderTop: '1px solid #262626',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Captions size={15} color={accent} aria-hidden="true" />
                Live Transcript
              </h3>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                {isLive ? 'LIVE' : phase === 'ended' ? 'SAVED' : 'IDLE'}
              </span>
            </div>

            <div
              ref={transcriptScrollRef}
              role="log"
              aria-live="polite"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', fontSize: 12, minHeight: 0 }}
            >
              {lines.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>
                  {phase === 'active'
                    ? 'Waiting for speech — your conversation will appear here.'
                    : phase === 'connecting'
                      ? 'Connecting…'
                      : 'Start the session to begin a live transcript.'}
                </p>
              ) : (
                lines.map((line, i) =>
                  line.speaker === 'agent' ? (
                    <div key={`${i}-${line.text.slice(0, 16)}`}>
                      <div style={{ ...transcriptLabelCoach, color: accent }}>Coach</div>
                      <div style={{ ...bubble, background: '#1a1a1a', color: 'rgba(255,255,255,0.9)', borderTopLeftRadius: 4 }}>
                        {line.text}
                      </div>
                    </div>
                  ) : (
                    <div key={`${i}-${line.text.slice(0, 16)}`} style={{ textAlign: 'right' }}>
                      <div style={transcriptLabelYou}>You</div>
                      <div
                        style={{
                          ...bubble,
                          background: accent,
                          color: '#fff',
                          borderTopRightRadius: 4,
                          display: 'inline-block',
                          textAlign: 'left',
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #262626',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                textAlign: 'center',
              }}
            >
              <SessionStat value={String(lines.length)} label="Exchanges" color="#fff" />
              <SessionStat value={String(userTurns)} label="Your turns" color="var(--wa-success)" />
              <SessionStat value={formatClock(elapsed)} label="Duration" color="var(--wa-gold)" />
            </div>
          </div>
        </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--wa-muted)', marginTop: 0 }}>
        Speak naturally with the AI coach. Your live transcript appears here while you practice.
      </p>
    </section>
  );
}

function SessionStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

const circleBtn: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
};

const bubble: React.CSSProperties = {
  borderRadius: 16,
  padding: '10px 14px',
};

const transcriptLabelCoach: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--wa-accent)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};

const transcriptLabelYou: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};

/* ============================================================ */
/* VIEW: RESUME STUDIO (BETA) — Career Studio                   */
/* ============================================================ */

/** Color band for the real structural score ring. */
function scoreBand(score: number): { color: string; label: string } {
  if (score >= 85) return { color: 'var(--wa-success)', label: 'Interview-ready structure' };
  if (score >= 70) return { color: 'var(--wa-gold)', label: 'Solid — a few fixes to go' };
  return { color: 'var(--wa-accent)', label: 'Needs work — start with the fixes below' };
}

function StudioPanel({ data }: { data: ResumeStudioData }) {
  const hasResume = data.hasResume;
  const score =
    typeof data.structuralScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(data.structuralScore)))
      : null;
  const issues = data.issues ?? [];
  const band = score !== null ? scoreBand(score) : null;

  // Ring geometry (r=52, stroke=11 → C≈326.7).
  const ringR = 52;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = score !== null ? ringC * (1 - score / 100) : ringC;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* crimson gradient banner */}
      <div
        className="wa-flex-col md:wa-flex-row"
        style={{
          background: 'linear-gradient(to bottom right, var(--wa-accent), var(--wa-accent-dark))',
          borderRadius: 24,
          padding: 'clamp(20px, 5vw, 28px)',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 10px 15px -3px rgba(120,20,38,0.15)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FlaskConical size={13} aria-hidden="true" />
            Career Studio
            <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 8 }}>BETA</span>
          </div>
          <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Resume Studio
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            {hasResume
              ? 'Your instant structural read and top fixes — then full AI scoring, rewrites, and voice coaching.'
              : 'Add your resume to get an instant structural read, full AI scoring, and rewrites.'}
          </p>
        </div>
        <Link
          href={hasResume ? TOOL_HREF['resume-studio'] + '?view=score' : TOOL_HREF['resume-studio']}
          className="vs-focus-dark vs-btn-solid"
          style={{
            padding: '12px 20px',
            background: '#fff',
            color: 'var(--wa-accent)',
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
          }}
        >
          <Upload size={14} aria-hidden="true" />
          {hasResume ? 'Open full analysis' : 'Add résumé'}
        </Link>
      </div>

      {hasResume && score !== null ? (
        <>
          {/* score + fixes */}
          <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
            {/* real structural score ring */}
            <div
              className="wa-kit-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <h3 style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wa-muted)', marginBottom: 12 }}>
                Structure Score
              </h3>
              <div style={{ position: 'relative' }}>
                <svg width="150" height="150" viewBox="0 0 120 120" role="img" aria-label={`Structure score ${score} of 100`}>
                  <circle cx="60" cy="60" r={ringR} fill="none" stroke="var(--wa-track)" strokeWidth="11" />
                  <circle
                    cx="60"
                    cy="60"
                    r={ringR}
                    fill="none"
                    stroke={band?.color ?? 'var(--wa-gold)'}
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={ringC.toFixed(1)}
                    strokeDashoffset={ringOffset.toFixed(1)}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: band?.color ?? 'var(--wa-gold)', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wa-muted)', letterSpacing: '0.08em' }}>OF 100</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 12 }}>
                {band?.label}. This is the instant structural read — run the full AI analysis for market &amp; skills-match scoring.
              </p>
            </div>

            {/* real top fixes */}
            <div className="wa-kit-card lg:wa-col-span-2">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>Top Fixes</h3>
                {issues.length > 0 ? (
                  <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', fontSize: 10, fontWeight: 700 }}>
                    {issues.length} found
                  </span>
                ) : null}
              </div>
              {issues.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {issues.map((issue, i) => (
                    <IssueRow key={i} issue={issue} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: 'var(--wa-bg)', border: '1px solid var(--wa-border)', borderRadius: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--wa-success-soft, rgba(74,155,79,0.12))', color: 'var(--wa-success)' }}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>No structural issues</div>
                    <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>
                      Your formatting, bullets, and quantification look strong. Run the full analysis for market &amp; skills-coverage insights.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* go-deeper CTA + voice card */}
          <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
            <div className="wa-kit-card lg:wa-col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 6 }}>Take it further</h3>
              <p style={{ fontSize: 13, color: 'var(--wa-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                The full AI analysis scores your resume against live job-market keywords and O*NET skills coverage, then
                rewrites weak bullets to lead with measurable impact.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                <Link
                  href={TOOL_HREF['resume-studio'] + '?view=score'}
                  className="wa-kit-focus vs-btn-solid"
                  style={{
                    padding: '10px 18px',
                    background: 'var(--wa-accent)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  Run full analysis
                </Link>
                <Link
                  href={TOOL_HREF['resume-rewriter']}
                  className="wa-kit-focus vs-btn-solid"
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    border: '1px solid var(--wa-border)',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: 999,
                    cursor: 'pointer',
                    color: 'var(--wa-text)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Rewrite a bullet
                </Link>
              </div>
            </div>

            {/* Crimson "Talk it through" voice card → unified Resume Coach session */}
            <Link
              href="/dashboard/ai-tools/studio?tab=session&agent=resume"
              className="wa-kit-focus vs-hero-card"
              style={{
                textAlign: 'left',
                background: 'linear-gradient(to bottom right, var(--wa-accent), var(--wa-accent-dark))',
                color: '#fff',
                borderRadius: 24,
                padding: 'clamp(20px, 5vw, 28px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(120,20,38,0.15)',
                textDecoration: 'none',
              }}
            >
              <div>
                <div style={{ padding: 12, width: 'fit-content', background: 'rgba(255,255,255,0.15)', borderRadius: 16, display: 'inline-flex' }}>
                  <Sparkles size={20} aria-hidden="true" />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginTop: 16 }}>Talk it through</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                  Prefer to discuss it out loud? Open the Resume Coach voice session with your draft loaded.
                </p>
              </div>
              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                <Mic size={13} aria-hidden="true" />
                Start voice session
              </div>
            </Link>
          </div>
        </>
      ) : (
        /* no resume on file — honest empty state */
        <div
          className="wa-kit-card"
          style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={26} aria-hidden="true" />
          </div>
          <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', margin: 0 }}>No resume on file yet</h3>
          <p style={{ fontSize: 13, color: 'var(--wa-muted)', maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
            Add your resume to see an instant structure score, your top fixes, and the full AI analysis with market &amp;
            skills-match scoring.
          </p>
          <Link
            href={TOOL_HREF['resume-studio']}
            className="wa-kit-focus vs-btn-solid"
            style={{
              marginTop: 4,
              padding: '10px 20px',
              background: 'var(--wa-accent)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 999,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Upload size={14} aria-hidden="true" />
            Add your resume
          </Link>
        </div>
      )}
    </section>
  );
}

function IssueRow({ issue }: { issue: ResumeStudioIssue }) {
  const { title, detail } = issue;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        background: 'var(--wa-bg)',
        border: '1px solid var(--wa-border)',
        borderRadius: 16,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'var(--wa-accent-soft)',
          color: 'var(--wa-accent)',
        }}
      >
        <Sparkles size={13} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{detail}</div>
      </div>
      <Link
        href={TOOL_HREF['resume-rewriter']}
        className="wa-kit-focus vs-btn-solid"
        style={{
          padding: '6px 12px',
          background: 'var(--wa-accent)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 10,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        Fix with AI
      </Link>
    </div>
  );
}

/* ============================================================ */
/* VIEW: AI TOOLKIT HUB                                          */
/* ============================================================ */

type ToolAccent = 'crimson' | 'gold' | 'blue';

interface ToolCard {
  Icon: LucideIcon;
  title: string;
  body: string;
  accent: ToolAccent;
  tag?: 'BETA' | 'VOICE';
  /** Real route this tool opens. */
  href: string;
}

interface ToolStep {
  n: number;
  title: string;
  tools: ToolCard[];
}

const TOOLKIT_STEPS: ToolStep[] = [
  {
    n: 1,
    title: 'Get your resume & applications ready',
    tools: [
      { Icon: FileText, title: 'Resume Studio', body: 'Score, rewrite & talk through your resume.', accent: 'crimson', tag: 'BETA', href: TOOL_HREF['resume-studio'] },
      { Icon: MailOpen, title: 'Cover Letter', body: 'Tailored to any saved job in seconds.', accent: 'crimson', href: TOOL_HREF['cover-letter'] },
      { Icon: CheckCircle2, title: 'Skill Checkpoints', body: "Verify what you've actually mastered.", accent: 'crimson', href: TOOL_HREF['skill-checkpoints'] },
    ],
  },
  {
    n: 2,
    title: 'Pre-interview prep & role targeting',
    tools: [
      { Icon: AudioLines, title: 'Interview Practice', body: 'Live mock interviews with voice coaching.', accent: 'crimson', tag: 'VOICE', href: TOOL_HREF['interview-practice'] },
      { Icon: Headset, title: 'Interview Coach', body: 'Question-by-question guidance.', accent: 'crimson', href: TOOL_HREF['interview-coach'] },
      { Icon: Search, title: 'Job Match Scorer', body: 'See how you match a specific job.', accent: 'blue', href: TOOL_HREF['job-match-scorer'] },
      { Icon: Network, title: 'Skill Mapper', body: 'Find skills employers want.', accent: 'blue', href: TOOL_HREF['skill-mapper'] },
      { Icon: Route, title: 'Training Bridge', body: 'Map missing skills to free training.', accent: 'gold', tag: 'BETA', href: TOOL_HREF['training-bridge'] },
    ],
  },
  {
    n: 3,
    title: 'Polish your profile & job-search strategy',
    tools: [
      { Icon: Linkedin, title: 'LinkedIn Headline', body: 'A headline recruiters stop on.', accent: 'blue', href: TOOL_HREF['linkedin-headline'] },
      { Icon: UserPen, title: 'LinkedIn About', body: 'Write your professional story.', accent: 'blue', href: TOOL_HREF['linkedin-about'] },
      { Icon: Search, title: 'Gap Analyzer', body: "See what's missing for a job.", accent: 'crimson', href: TOOL_HREF['gap-analyzer'] },
      { Icon: MessagesSquare, title: 'Salary Negotiation', body: 'Practice asking for better pay.', accent: 'crimson', href: TOOL_HREF['salary-negotiation'] },
      { Icon: Scale, title: 'Benefits Cliff Check', body: 'Will this offer leave you better off?', accent: 'gold', tag: 'BETA', href: TOOL_HREF['benefits-cliff'] },
    ],
  },
];

function ToolkitPanel() {
  // Computed (not hardcoded) so the count can never drift from what's
  // actually rendered below as tools are added or removed from a step.
  const toolCount = TOOLKIT_STEPS.reduce((n, step) => n + step.tools.length, 0);
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--wa-accent)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <Sparkles size={13} aria-hidden="true" />
          <span>AI Career Toolkit</span>
        </div>
        <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Everything to get hired, in order.
        </h2>
        <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
          {toolCount} AI tools tuned to your training path and the Austin market. Work top to bottom.
        </p>
      </div>

      {TOOLKIT_STEPS.map((step) => (
        <div key={step.n}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: 'var(--wa-accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {step.n}
            </span>
            <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>{step.title}</h3>
          </div>
          <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-4">
            {step.tools.map((tool) => (
              <ToolCardView key={tool.title} tool={tool} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ToolCardView({ tool }: { tool: ToolCard }) {
  const { Icon, title, body, accent, tag, href } = tool;
  const accentStyle =
    accent === 'gold'
      ? { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' }
      : accent === 'blue'
        ? { background: 'var(--wa-info-soft)', color: 'var(--wa-info)' }
        : { background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' };
  const cardBorder = accent === 'gold' ? '#ece2c8' : 'var(--wa-border)';
  const tagStyle =
    accent === 'gold'
      ? { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' }
      : { background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' };

  return (
    <Link
      href={href}
      className="wa-kit-focus vs-hero-card"
      style={{
        textAlign: 'left',
        background: 'var(--wa-surface)',
        border: `1px solid ${cardBorder}`,
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        textDecoration: 'none',
        color: 'var(--wa-text)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ padding: 10, borderRadius: 12, display: 'inline-flex', ...accentStyle }}>
          <Icon size={16} aria-hidden="true" />
        </div>
        {tag === 'BETA' ? (
          <span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 4, ...tagStyle }}>BETA</span>
        ) : tag === 'VOICE' ? (
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wa-muted)', textTransform: 'uppercase' }}>Voice</span>
        ) : null}
      </div>
      <h4 style={{ fontWeight: 700, fontSize: 14, marginTop: 12 }}>{title}</h4>
      <p style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 2 }}>{body}</p>
    </Link>
  );
}

/* ============================================================ */
/* Orb / ring / equalizer keyframes — reduced-motion gated.      */
/* ============================================================ */

const ORB_CSS = `
@keyframes vsOrbPulse { 0%,100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.06); opacity: 1 } }
@keyframes vsRing { 0% { transform: scale(1); opacity: .5 } 100% { transform: scale(1.8); opacity: 0 } }
@keyframes vsEq { 0%,100% { height: 20% } 50% { height: 100% } }
@keyframes vsPulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
.vs-orb-core { animation: vsOrbPulse 2.4s ease-in-out infinite; }
.vs-orb-ring { animation: vsRing 2.8s ease-out infinite; }
.vs-orb-ring.vs-d2 { animation-delay: .9s; }
.vs-orb-ring.vs-d3 { animation-delay: 1.8s; }
.vs-eqbar { height: 60%; animation: vsEq 1s ease-in-out infinite; }
.vs-dot { animation: vsPulse 1.6s ease-in-out infinite; }
.vs-focus-dark:focus-visible { outline: none; box-shadow: 0 0 0 2px #121212, 0 0 0 4px #ad2c4d; }

/* Micro-interactions — transform/opacity only, so they're cheap to composite
   and safe to disable wholesale under reduced motion below. */
.vs-tab-btn { transition: background-color 150ms ease; }
.vs-tab-btn:hover { background: rgba(255,255,255,0.08); }
.vs-hero-card { transition: transform 180ms ease; }
.vs-hero-card:hover { transform: translateY(-3px); }
.vs-hero-card:active { transform: scale(0.98); }
.vs-btn-solid { transition: transform 160ms ease, opacity 160ms ease; }
.vs-btn-solid:hover { opacity: 0.92; }
.vs-btn-solid:active { transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .vs-orb-core, .vs-orb-ring, .vs-eqbar, .vs-dot { animation: none; }
  .vs-tab-btn, .vs-hero-card, .vs-btn-solid { transition: none; }
  .vs-hero-card:hover, .vs-hero-card:active, .vs-btn-solid:hover, .vs-btn-solid:active {
    transform: none;
    opacity: 1;
  }
}
`;
