import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  LayoutGrid,
  Briefcase,
  ChevronRight,
  Wand2,
  Brain,
  FileText,
  MessagesSquare,
  MailOpen,
  Route,
  IdCard,
  UserRound,
  Compass,
  Wallet,
  ShieldCheck,
  Landmark,
  GitBranch,
  Headset,
  LineChart,
  Mic,
  type LucideIcon,
} from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import VoiceCoachesPromo from '@/components/portal/VoiceCoachesPromo';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import QueryToast from '@/components/portal/QueryToast';
import { AI_TOOLKIT_EXTRA_SECTIONS, AI_TOOLS_HUB } from '@/lib/portal/aiToolsHub';
import JourneyStageGuide from '@/components/portal/JourneyStageGuide';
import { getTranslations } from 'next-intl/server';
import { CardHead, StatusTag, colorVar, type KitColor } from '@/components/portal/kit';

/**
 * Material-symbol name (lib/portal/aiToolsHub.ts) → lucide icon, so the
 * Command Center tool grid below can render kit-styled icon chips without
 * touching the shared tool registry (still Material Symbols elsewhere, e.g.
 * PortalNav / MemberQuickActions).
 */
const TOOL_ICONS: Record<string, LucideIcon> = {
  record_voice_over: Mic,
  psychology: Brain,
  description: FileText,
  forum: MessagesSquare,
  business_center: Briefcase,
  draft: MailOpen,
  auto_fix_high: Wand2,
  account_tree: GitBranch,
  alt_route: Route,
  badge: IdCard,
  person: UserRound,
  troubleshoot: Compass,
  payments: Wallet,
  verified: ShieldCheck,
  account_balance: Landmark,
  query_stats: LineChart,
  support_agent: Headset,
};

/** One semantic accent per guided-search step, distinct from the crimson brand accent. */
const SECTION_COLORS: KitColor[] = ['info', 'gold', 'success'];

/** Tool hrefs flagged `badge: 'Beta'` in the richer AI_TOOLS_HUB registry. */
const BETA_TOOL_HREFS = new Set(
  AI_TOOLS_HUB.filter((category) => category.badge).flatMap((category) => category.links.map((l) => l.href)),
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
  title: t('aiToolkit'),
  description: t('aiToolkitDescription'),
  path: '/dashboard/ai-tools',
});
}

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools');
  const tBlog = await getTranslations('marketing.blog');
  const tCommon = await getTranslations('marketing.common');

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <QueryToast />
      <div className="wa-pb-24 md:wa-pb-0">
        <div className="wa-hidden md:wa-block" style={{ padding: '1.5rem 1.5rem 0', maxWidth: '1100px', margin: '0 auto' }}>
          <PortalBreadcrumb items={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'Career Toolkit' },
          ]} />
        </div>
        <section
          style={{
            padding: 'clamp(1.5rem, 3vw, 2.25rem) 1.5rem 1.25rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--surface-container-lowest) 100%)',
          }}
        >
          <p
            className="wa-block md:wa-hidden"
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: '0.5rem',
            }}
          >
            {tBlog('includedForMembers')}
          </p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              color: 'var(--color-accent)',
              marginBottom: '1rem',
            }}
          >
            {tBlog('betaAccess')}
          </span>
          <h1 className="text-display-sm" style={{ margin: '0 0 0.5rem' }}>
            {tBlog('careerToolkit')}
          </h1>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              maxWidth: '520px',
              margin: '0 auto 1.5rem',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              lineHeight: 1.6,
            }}
          >
            {tCommon('startWithToolCards')}
          </p>
          <Link
            href="/dashboard/ai-tools/history"
            className="btn btn-outline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
              history
            </span>
            {tCommon('viewMyPastResults')}
          </Link>
          <Link
            href="/dashboard/ai-tools/interview-prep"
            className="btn btn-outline"
            style={{ marginLeft: '0.5rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
              library_books
            </span>
            {tCommon('prepBundle')}
          </Link>
        </section>
      </div>

      {/* Journey-first guided layer (beta) — additive; full grid below unchanged */}
      <JourneyStageGuide />

      <section style={{ maxWidth: '1100px', margin: '0 auto 1.25rem', padding: '0 clamp(1rem, 4vw, 1.5rem)' }}>
        <div className="wa-kit-card wa-kit-card--gradient-crimson">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div className="wa-flex wa-items-center wa-gap-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75 }}>
                <Sparkles size={13} aria-hidden="true" />
                {tCommon('startHere')}
              </div>
              <h2 className="h-font" style={{ margin: '0.35rem 0 0', fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {tCommon('pathToCertification')}
              </h2>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', opacity: 0.85, maxWidth: '36rem', lineHeight: 1.55 }}>
                {tCommon('pathToCertificationDescription')}
              </p>
            </div>
            <Link
              href="/dashboard/program/start"
              className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                padding: '10px 20px',
                background: 'var(--wa-on-accent)',
                color: 'var(--wa-accent)',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              {tCommon('openEnrollmentGuide')}
            </Link>
          </div>
        </div>
      </section>

      {/* Voice coaches */}
      <div style={{ marginBottom: '1.5rem' }}>
        <VoiceCoachesPromo />
      </div>

      {/* Guided job search steps — Command Center tool grid, entry point to ~30 AI tools */}
      <section style={{ maxWidth: '1100px', margin: '0 auto 2rem', padding: '0 clamp(1rem, 4vw, 1.5rem)' }}>
        <div className="wa-flex wa-items-center wa-gap-2" style={{ marginBottom: '0.875rem' }}>
          <LayoutGrid size={16} color="var(--wa-accent)" aria-hidden="true" />
          <h2 className="wa-kit-stat-label" style={{ fontSize: 11, margin: 0 }}>{tCommon('guidedJobSearch')}</h2>
        </div>

        <div
          className="wa-kit-card wa-kit-card--sm"
          style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--wa-radius-sm)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in srgb, var(--wa-info) 14%, transparent)',
              color: 'var(--wa-info)',
            }}
          >
            <Briefcase size={17} />
          </div>
          <p style={{ margin: 0, flex: 1, minWidth: '14rem', fontSize: '0.875rem', color: 'var(--wa-muted)', lineHeight: 1.5 }}>
            {tCommon('applicationTrackerMoved')}
          </p>
          <Link
            href="/dashboard/job-applications"
            className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 40,
              padding: '8px 16px',
              border: '1px solid var(--wa-border)',
              color: 'var(--wa-text)',
              fontWeight: 600,
              fontSize: 12.5,
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            {tCommon('openTracker')}
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {AI_TOOLKIT_EXTRA_SECTIONS.map((section, sectionIndex) => {
            const sectionColor = SECTION_COLORS[sectionIndex % SECTION_COLORS.length];
            return (
              <div key={section.title} className="wa-kit-card">
                <CardHead title={section.title} />
                <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-3">
                  {section.tools.map((tool) => {
                    const Icon = TOOL_ICONS[tool.icon] ?? Wand2;
                    const isBeta = BETA_TOOL_HREFS.has(tool.href);
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="wa-kit-focus wa-kit-card--hover"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: 14,
                          borderRadius: 'var(--wa-radius-sm)',
                          border: '1px solid var(--wa-border)',
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--wa-radius-sm)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `color-mix(in srgb, ${colorVar(sectionColor)} 14%, transparent)`,
                            color: colorVar(sectionColor),
                          }}
                        >
                          <Icon size={17} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="wa-flex wa-items-center wa-gap-2" style={{ flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--wa-text)', lineHeight: 1.35 }}>
                              {tool.label}
                            </span>
                            {isBeta ? <StatusTag tone="info">Beta</StatusTag> : null}
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          color="var(--wa-muted)"
                          aria-hidden="true"
                          style={{ flexShrink: 0, marginTop: 2, opacity: 0.5 }}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="wa-block md:wa-hidden">      </div>
    </div>
  );
}
