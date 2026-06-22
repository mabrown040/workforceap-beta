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
import { useState } from 'react';
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
  Video,
  PhoneOff,
  Captions,
  Palette,
  ArrowRight,
  Upload,
  Hash,
  KeyRound,
  Play,
  Circle,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';
import { DesignSurface } from '../DesignSurface';

type StudioTab = 'coaches' | 'session' | 'studio' | 'toolkit';

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
  { id: 'coaches', label: 'Voice Coaches' },
  { id: 'session', label: 'Live Session' },
  { id: 'studio', label: 'Resume Studio · Beta' },
  { id: 'toolkit', label: 'AI Toolkit' },
];

export interface VoiceStudioKitProps {
  /** Which tab to show first. */
  initialTab?: StudioTab;
  /** Resume score shown in the Career Studio ring (0–100). */
  resumeScore?: number;
  /** Live-session running clock (top-right of orb panel). */
  sessionClock?: string;
  /** Live-session footer stats. */
  exchanges?: number;
  clarity?: number;
  points?: number;
}

export function VoiceStudioKit({
  initialTab = 'coaches',
  resumeScore = 72,
  sessionClock = '04:12',
  exchanges = 12,
  clarity = 86,
  points = 50,
}: VoiceStudioKitProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);

  // Resume score ring geometry (matches mockup: r=52, stroke=11 → C≈326.7).
  const ringR = 52;
  const ringC = 2 * Math.PI * ringR; // ≈ 326.7
  const score = Math.max(0, Math.min(100, Math.round(resumeScore)));
  const ringOffset = ringC * (1 - score / 100); // 72 → ≈91.5

  return (
    <DesignSurface surface="warm">
      <style>{ORB_CSS}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--wa-bg)', color: 'var(--wa-text)' }}>
        {/* ============ STICKY DARK HEADER + TABS ============ */}
        <header
          style={{ position: 'sticky', top: 0, zIndex: 50, background: '#1a1a1a', color: '#fff' }}
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
                <AudioLines size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>Voice AI + Career Studio</div>
                <div style={{ fontSize: 10, color: '#a3a3a3' }}>
                  Reskinned to DESIGN.md · crimson #ad2c4d primary, gold #a47f38 achievement
                </div>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Voice studio sections"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
                background: '#262626',
                borderRadius: 12,
                padding: 4,
                border: '1px solid #404040',
                maxWidth: '100%',
              }}
            >
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(t.id)}
                    className="wa-kit-focus"
                    style={{
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: on ? 'var(--wa-accent)' : 'transparent',
                      color: on ? '#fff' : '#a3a3a3',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main style={{ flexGrow: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: 16, boxSizing: 'border-box' }}>
          {tab === 'coaches' && <CoachesPanel onMockInterview={() => setTab('session')} />}
          {tab === 'session' && <SessionPanel clock={sessionClock} exchanges={exchanges} clarity={clarity} points={points} />}
          {tab === 'studio' && (
            <StudioPanel score={score} ringC={ringC} ringR={ringR} ringOffset={ringOffset} />
          )}
          {tab === 'toolkit' && <ToolkitPanel />}
        </main>

        <footer style={{ background: '#1a1a1a', color: '#737373', fontSize: 10, textAlign: 'center', padding: '12px 16px' }}>
          Crimson #ad2c4d primary · gold #a47f38 achievement · blue #2b7bb9 supporting · WCAG AA focus rings · reduced-motion aware
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
  /** Real route this card opens. Omitted for the Mock Interview demo card,
   * which instead switches to the in-page Live Session tab. */
  href?: string;
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
    href: TOOL_HREF['readiness-coach'],
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
    href: TOOL_HREF['resume-coach'],
  },
  {
    key: 'mock',
    variant: 'crimson-deep',
    Icon: AudioLines,
    badge: 'PRACTICE',
    title: 'Mock Interview',
    body: 'Answer out loud. Optional camera recording for review afterward.',
    ctaIcon: Play,
    cta: 'Try it live',
  },
  {
    key: 'counselor',
    variant: 'counselor',
    Icon: Headphones,
    badge: 'COUNSELOR',
    title: 'Talk to Your Counselor',
    body: 'Private voice session — then your personalized action plan.',
    ctaIcon: Mic,
    cta: 'Start session',
    href: TOOL_HREF.counselor,
  },
  {
    key: 'business',
    variant: 'dark',
    Icon: Briefcase,
    badge: 'ADVANCED',
    title: 'Career & Business Coach',
    body: 'Broader career, PM, sales, marketing and business guidance.',
    ctaIcon: Mic,
    cta: 'Start session',
    href: TOOL_HREF['career-business-coach'],
  },
  {
    key: 'elevator',
    variant: 'gold-light',
    Icon: Zap,
    badge: '10–20 SEC',
    title: 'Elevator Introduction',
    body: 'Generate a sharp intro, save it, then rehearse it on camera.',
    ctaIcon: ArrowRight,
    cta: 'Build mine',
    href: TOOL_HREF['elevator-pitch'],
  },
];

function CoachesPanel({ onMockInterview }: { onMockInterview: () => void }) {
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
            <Headset size={13} />
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
          <Circle size={7} fill="var(--wa-success)" color="var(--wa-success)" />
          ElevenLabs · low-latency
        </div>
      </div>

      {/* reskin note callout */}
      <div
        style={{
          background: 'var(--wa-accent-soft)',
          border: '1px solid #f3d4dc',
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          fontSize: 12,
        }}
      >
        <Palette size={14} color="var(--wa-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <span style={{ fontWeight: 700, color: 'var(--wa-accent)' }}>Reskin:</span>{' '}
          <span style={{ color: '#525252' }}>
            today each coach uses a different off-brand gradient (teal / blue / purple / magenta). Below, every coach is
            brought into the brand — crimson for action coaches, gold for the achievement/readiness coach, blue
            (supporting) for the counselor. One coherent family.
          </span>
        </div>
      </div>

      <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-5">
        {COACH_CARDS.map((c) => (
          <CoachCardView key={c.key} card={c} onClick={c.key === 'mock' ? onMockInterview : undefined} />
        ))}
      </div>
    </section>
  );
}

function CoachCardView({ card, onClick }: { card: CoachCard; onClick?: () => void }) {
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
      cardStyle = { background: 'linear-gradient(to bottom right, #a47f38, #7d5f26)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(120,93,38,0.15)' };
      iconChip = { background: 'rgba(255,255,255,0.15)' };
      badgeStyle = { background: 'rgba(255,255,255,0.2)' };
      bodyColor = 'rgba(255,255,255,0.8)';
      ctaColor = undefined;
      break;
    case 'crimson':
      cardStyle = { background: 'linear-gradient(to bottom right, #ad2c4d, #8b1f38)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(120,20,38,0.15)' };
      iconChip = { background: 'rgba(255,255,255,0.15)' };
      badgeStyle = { background: 'rgba(255,255,255,0.2)' };
      bodyColor = 'rgba(255,255,255,0.8)';
      break;
    case 'crimson-deep':
      cardStyle = { background: 'linear-gradient(to bottom right, #8b1f38, #5e1426)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(120,20,38,0.15)' };
      iconChip = { background: 'rgba(255,255,255,0.15)' };
      badgeStyle = { background: 'rgba(255,255,255,0.2)' };
      bodyColor = 'rgba(255,255,255,0.8)';
      break;
    case 'counselor':
      cardStyle = { background: 'var(--wa-surface)', border: '1px solid var(--wa-border)', color: 'var(--wa-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
      iconChip = { background: '#eef5fb', color: 'var(--wa-info)', border: '1px solid #d6e6f3' };
      badgeStyle = { background: '#eef5fb', color: 'var(--wa-info)' };
      bodyColor = 'var(--wa-muted)';
      ctaColor = 'var(--wa-info)';
      break;
    case 'dark':
      cardStyle = { background: '#1a1a1a', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' };
      iconChip = { background: 'var(--wa-accent)' };
      badgeStyle = { background: 'rgba(255,255,255,0.1)' };
      bodyColor = 'rgba(255,255,255,0.7)';
      break;
    case 'gold-light':
    default:
      cardStyle = { background: '#faf7f0', border: '1px solid #ece2c8', color: 'var(--wa-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
      iconChip = { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' };
      badgeStyle = { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' };
      bodyColor = 'var(--wa-muted)';
      ctaColor = 'var(--wa-gold)';
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
          <Icon size={20} />
        </div>
        <span
          style={{
            padding: '2px 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            borderRadius: 999,
            ...badgeStyle,
          }}
        >
          {badge}
        </span>
      </div>
      <div>
        <h3 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ fontSize: 12, color: bodyColor, marginTop: 4 }}>{body}</p>
        <div
          style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: ctaColor ?? (isLightBody ? 'var(--wa-text)' : '#fff'),
          }}
        >
          <Cta size={13} />
          {cta}
        </div>
      </div>
    </>
  );

  // Cards with a real route navigate via Link; the Mock Interview card (no
  // href) keeps its in-page tab-switch onClick instead.
  if (card.href) {
    return (
      <Link href={card.href} className="wa-kit-focus" style={{ ...sharedStyle, textDecoration: 'none' }}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="wa-kit-focus" style={sharedStyle}>
      {inner}
    </button>
  );
}

/* ============================================================ */
/* VIEW: LIVE VOICE SESSION                                      */
/* ============================================================ */

function SessionPanel({
  clock,
  exchanges,
  clarity,
  points,
}: {
  clock: string;
  exchanges: number;
  clarity: number;
  points: number;
}) {
  return (
    <section>
      <div style={{ background: '#1a1a1a', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)' }}>
        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-5" style={{ minHeight: 560 }}>
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
              <span className="vs-dot" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--wa-success)' }} />
              CONNECTED · Mock Interview
            </div>
            <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              <Clock size={13} />
              {clock}
            </div>

            {/* mic orb */}
            <div style={{ position: 'relative', width: 'min(224px, 60vw)', height: 'min(224px, 60vw)', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0' }}>
              <span className="vs-orb-ring" style={ringStyle} />
              <span className="vs-orb-ring vs-d2" style={ringStyle} />
              <span className="vs-orb-ring vs-d3" style={ringStyle} />
              <div
                className="vs-orb-core"
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 999,
                  background: 'linear-gradient(to bottom right, #ad2c4d, #8b1f38)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 25px 50px -12px rgba(120,20,38,0.4)',
                }}
              >
                <Mic size={40} />
              </div>
            </div>

            {/* equalizer */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32, marginBottom: 12 }}>
              {[0, 0.15, 0.3, 0.1, 0.25].map((delay, i) => (
                <span
                  key={i}
                  className="vs-eqbar"
                  style={{ width: 4, background: 'var(--wa-accent)', borderRadius: 999, animationDelay: `${delay}s` }}
                />
              ))}
            </div>

            <p style={{ fontSize: 14, fontWeight: 600 }}>Listening — speak when ready</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Coach is asking about your AWS experience</p>

            {/* controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
              <button className="vs-focus-dark" aria-label="Mute" style={circleBtn}>
                <MicOff size={16} />
              </button>
              <button
                className="vs-focus-dark"
                style={{
                  padding: '12px 24px',
                  borderRadius: 999,
                  background: 'var(--wa-accent)',
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
                <PhoneOff size={15} />
                End Session
              </button>
              <button className="vs-focus-dark" aria-label="Camera" style={circleBtn}>
                <Video size={16} />
              </button>
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
                <Captions size={15} color="var(--wa-accent)" />
                Live Transcript
              </h3>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>AUTO-SAVING</span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', fontSize: 12 }}>
              <div>
                <div style={transcriptLabelCoach}>Coach</div>
                <div style={{ ...bubble, background: '#1a1a1a', color: 'rgba(255,255,255,0.9)', borderTopLeftRadius: 4 }}>
                  Tell me about a time you solved a technical problem under pressure.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={transcriptLabelYou}>You</div>
                <div
                  style={{
                    ...bubble,
                    background: 'var(--wa-accent)',
                    color: '#fff',
                    borderTopRightRadius: 4,
                    display: 'inline-block',
                    textAlign: 'left',
                  }}
                >
                  During my AWS labs, a deployment failed mid-demo. I traced it to an IAM policy...
                </div>
              </div>
              <div>
                <div style={transcriptLabelCoach}>Coach</div>
                <div style={{ ...bubble, background: '#1a1a1a', color: 'rgba(255,255,255,0.9)', borderTopLeftRadius: 4 }}>
                  Good — that&apos;s a strong STAR setup. Can you quantify the impact?
                </div>
              </div>
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
              <SessionStat value={String(exchanges)} label="Exchanges" color="#fff" />
              <SessionStat value={String(clarity)} label="Clarity" color="var(--wa-success)" />
              <SessionStat value={`+${points}`} label="Points" color="var(--wa-gold)" />
            </div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--wa-muted)', marginTop: 16 }}>
        After the session ends, your transcript becomes a saved action plan with suggested next steps.
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

const ringStyle: React.CSSProperties = {
  position: 'absolute',
  width: 160,
  height: 160,
  borderRadius: 999,
  border: '1px solid var(--wa-accent)',
};

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

interface Issue {
  Icon: LucideIcon;
  title: string;
  body: string;
  /** crimson Fix button or gold Fix button. */
  fixTone: 'crimson' | 'gold';
  chipTone: 'crimson' | 'gold';
}

const ISSUES: Issue[] = [
  {
    Icon: Zap,
    title: 'Weak action verbs in 4 bullets',
    body: '"Responsible for…" reads passive. AI can rewrite to lead with impact.',
    fixTone: 'crimson',
    chipTone: 'crimson',
  },
  {
    Icon: Hash,
    title: 'No quantified results',
    body: 'Add numbers (%, $, time saved) to show impact employers can measure.',
    fixTone: 'crimson',
    chipTone: 'crimson',
  },
  {
    Icon: KeyRound,
    title: 'Missing keywords for "Cloud Support"',
    body: 'Add: IAM, EC2, troubleshooting, ticketing — matched from your target jobs.',
    fixTone: 'gold',
    chipTone: 'gold',
  },
];

function StudioPanel({
  score,
  ringC,
  ringR,
  ringOffset,
}: {
  score: number;
  ringC: number;
  ringR: number;
  ringOffset: number;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* crimson gradient banner */}
      <div
        className="wa-flex-col md:wa-flex-row"
        style={{
          background: 'linear-gradient(to bottom right, #ad2c4d, #8b1f38)',
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
            <FlaskConical size={13} />
            Career Studio
            <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 8 }}>BETA</span>
          </div>
          <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Resume Studio
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            Score it, fix the top issues with AI rewrites, or talk it through out loud — all in one place.
          </p>
        </div>
        <Link
          href={TOOL_HREF['resume-studio']}
          className="vs-focus-dark"
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
          <Upload size={14} />
          Upload Resume
        </Link>
      </div>

      {/* score + issues */}
      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
        {/* score ring card */}
        <div
          className="wa-kit-card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
        >
          <h3 style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wa-muted)', marginBottom: 12 }}>
            Resume Score
          </h3>
          <div style={{ position: 'relative' }}>
            <svg width="150" height="150" viewBox="0 0 120 120" role="img" aria-label={`Resume score ${score} of 100`}>
              <circle cx="60" cy="60" r={ringR} fill="none" stroke="#f0eef0" strokeWidth="11" />
              <circle
                cx="60"
                cy="60"
                r={ringR}
                fill="none"
                stroke="var(--wa-gold)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={ringC.toFixed(1)}
                strokeDashoffset={ringOffset.toFixed(1)}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--wa-gold)', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wa-muted)', letterSpacing: '0.08em' }}>OF 100</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 12 }}>
            Solid. Fix the 3 issues on the right to reach the 85+ &quot;interview-ready&quot; band.
          </p>
        </div>

        {/* top issues card */}
        <div className="wa-kit-card lg:wa-col-span-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>Top Issues to Fix</h3>
            <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)', fontSize: 10, fontWeight: 700 }}>
              3 found
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ISSUES.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        </div>
      </div>

      {/* before/after rewrite + voice card */}
      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
        <div className="wa-kit-card lg:wa-col-span-2">
          <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 16 }}>AI Rewrite Preview</h3>
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-2 wa-gap-4">
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--wa-muted)', marginBottom: 8 }}>
                Before
              </div>
              <div
                style={{
                  padding: 16,
                  background: 'var(--wa-bg)',
                  border: '1px solid var(--wa-border)',
                  borderRadius: 16,
                  fontSize: 12,
                  color: '#525252',
                  lineHeight: 1.6,
                }}
              >
                Responsible for helping customers with cloud issues and was part of the team that managed deployments.
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--wa-success)',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={12} />
                After
              </div>
              <div
                style={{
                  padding: 16,
                  background: '#ecfdf5',
                  border: '1px solid #d1fae5',
                  borderRadius: 16,
                  fontSize: 12,
                  color: 'var(--wa-text)',
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                Resolved 40+ weekly customer cloud issues across IAM and EC2, and co-led deployments that cut release
                errors by 30%.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Link
              href={TOOL_HREF['resume-rewriter']}
              className="wa-kit-focus"
              style={{
                padding: '8px 16px',
                background: 'var(--wa-accent)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Accept Rewrite
            </Link>
            <Link
              href={TOOL_HREF['resume-rewriter']}
              className="wa-kit-focus"
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--wa-border)',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 999,
                cursor: 'pointer',
                color: 'var(--wa-text)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Regenerate
            </Link>
          </div>
        </div>

        {/* gold "Talk it through" voice card → Resume Coach voice session */}
        <Link
          href={TOOL_HREF['resume-coach']}
          className="wa-kit-focus"
          style={{
            textAlign: 'left',
            background: 'linear-gradient(to bottom right, #a47f38, #7d5f26)',
            color: '#fff',
            borderRadius: 24,
            padding: 'clamp(20px, 5vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 10px 15px -3px rgba(120,93,38,0.15)',
            textDecoration: 'none',
          }}
        >
          <div>
            <div style={{ padding: 12, width: 'fit-content', background: 'rgba(255,255,255,0.15)', borderRadius: 16, display: 'inline-flex' }}>
              <Headset size={20} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginTop: 16 }}>Talk it through</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              Prefer to discuss it out loud? Open the Resume Coach voice session with this draft loaded.
            </p>
          </div>
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
            <Mic size={13} />
            Start voice session
          </div>
        </Link>
      </div>
    </section>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const { Icon, title, body, fixTone, chipTone } = issue;
  const chipStyle =
    chipTone === 'gold'
      ? { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' }
      : { background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' };
  const fixBg = fixTone === 'gold' ? 'var(--wa-gold)' : 'var(--wa-accent)';

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
          ...chipStyle,
        }}
      >
        <Icon size={13} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{body}</div>
      </div>
      <Link
        href={TOOL_HREF['resume-rewriter']}
        className="wa-kit-focus"
        style={{
          padding: '6px 12px',
          background: fixBg,
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
          <Sparkles size={13} />
          <span>AI Career Toolkit</span>
        </div>
        <h2 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', marginTop: 4, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Everything to get hired, in order.
        </h2>
        <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
          17 AI tools tuned to your AWS path and the Austin market. Work top to bottom.
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
        ? { background: '#eef5fb', color: 'var(--wa-info)' }
        : { background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' };
  const cardBorder = accent === 'gold' ? '#ece2c8' : 'var(--wa-border)';
  const tagStyle =
    accent === 'gold'
      ? { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold)' }
      : { background: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' };

  return (
    <Link
      href={href}
      className="wa-kit-focus"
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
          <Icon size={16} />
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
@media (prefers-reduced-motion: reduce) {
  .vs-orb-core, .vs-orb-ring, .vs-eqbar, .vs-dot { animation: none; }
}
`;
