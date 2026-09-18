'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SectionHeader, StatusTag, useAnnounce } from '@/components/portal/kit';
import type { ReadinessPriorityAction } from '@/lib/readiness/progressView';
import type { ReadinessSummarySource } from '@/lib/readiness/progressSummary';

type SummaryResponse = {
  source?: ReadinessSummarySource;
  summary?: string;
  error?: string;
};

function sourceTone(source: ReadinessSummarySource): 'ok' | 'info' | 'warn' | 'danger' {
  switch (source) {
    case 'ai':
      return 'ok';
    case 'factual':
      return 'info';
    case 'error':
      return 'danger';
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

function sourceLabel(source: ReadinessSummarySource, generating: boolean): string {
  if (generating) return 'Writing recap';
  switch (source) {
    case 'ai':
      return 'AI recap';
    case 'factual':
      return 'From your numbers';
    case 'error':
      return 'Couldn’t load';
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/**
 * Kit-token progress recap for `/dashboard/readiness`.
 * Starts from the server-built factual recap; may replace it with an AI rewrite
 * of the same validated numbers. Never paints Astryx inside the kit page.
 */
export function ReadinessProgressSummary({
  factualSummary,
  nextAction,
  coachHref = '/dashboard/ai-tools/studio?tab=session&agent=readiness',
  enableGeneration = true,
  loadFailed = false,
}: {
  factualSummary: string;
  nextAction: ReadinessPriorityAction | null;
  coachHref?: string;
  enableGeneration?: boolean;
  loadFailed?: boolean;
}) {
  const announce = useAnnounce();
  const [summary, setSummary] = useState(factualSummary);
  const [source, setSource] = useState<ReadinessSummarySource>(loadFailed ? 'error' : 'factual');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setSummary(factualSummary);
    setSource(loadFailed ? 'error' : 'factual');
  }, [factualSummary, loadFailed]);

  useEffect(() => {
    if (!enableGeneration || loadFailed) return;
    const ac = new AbortController();
    setGenerating(true);
    void (async () => {
      try {
        const res = await fetch('/api/member/readiness/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
        });
        const data = (await res.json().catch(() => ({}))) as SummaryResponse;
        if (ac.signal.aborted) return;
        if (!res.ok || !data.summary) return;
        if (data.source === 'ai' || data.source === 'factual' || data.source === 'error') {
          setSource(data.source);
        }
        setSummary(data.summary);
        if (data.source === 'ai') {
          announce('Updated progress recap');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        if (!ac.signal.aborted) setGenerating(false);
      }
    })();
    return () => ac.abort();
  }, [announce, enableGeneration, loadFailed]);

  return (
    <section
      className="wa-kit-card"
      aria-label="What this score means"
      data-testid="readiness-progress-summary"
    >
      <SectionHeader
        kicker="Coach note"
        title="What this score means"
        goal="Why the numbers look this way, and what to do next."
        className="wa-mb-3"
        action={
          <StatusTag tone={generating ? 'muted' : sourceTone(source)}>
            <span className="wa-inline-flex wa-items-center wa-gap-1">
              <Sparkles size={14} aria-hidden="true" />
              {sourceLabel(source, generating)}
            </span>
          </StatusTag>
        }
      />
      <p className="wa-kit-lede">
        {summary}
      </p>
      <div className="wa-flex wa-flex-wrap wa-gap-3" style={{ marginTop: 16 }}>
        {nextAction ? (
          <a
            href={nextAction.href}
            className="wa-kit-cta wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
          >
            <ArrowRight size={14} aria-hidden="true" />
            {nextAction.ctaLabel}
          </a>
        ) : null}
        <a
          href={coachHref}
          className="wa-kit-cta wa-kit-cta--ghost wa-kit-focus hover:wa-opacity-90"
        >
          Open readiness coach
        </a>
      </div>
    </section>
  );
}
