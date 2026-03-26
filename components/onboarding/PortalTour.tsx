'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface TourStep {
  targetId: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface PortalTourProps {
  steps: TourStep[];
  portal: 'member' | 'employer' | 'partner';
  onComplete: () => void;
}

function postTourComplete(portal: PortalTourProps['portal']) {
  return fetch('/api/onboarding/tour-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portal }),
  });
}

type PopoverLayout = { top: number; left: number; width: number };

function layoutPopover(
  rect: DOMRect,
  placement: TourStep['placement'],
  popW: number,
  popH: number
): PopoverLayout {
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const place = placement ?? 'right';
  let top = rect.bottom + margin;
  let left = rect.left;

  if (place === 'right') {
    left = rect.right + margin;
    top = rect.top + rect.height / 2 - popH / 2;
    if (left + popW > vw - margin) {
      left = rect.left - popW - margin;
    }
    if (top + popH > vh - margin) top = vh - popH - margin;
    if (top < margin) top = margin;
  } else if (place === 'left') {
    left = rect.left - popW - margin;
    top = rect.top + rect.height / 2 - popH / 2;
    if (left < margin) {
      left = Math.min(Math.max(margin, rect.left), vw - popW - margin);
      top = rect.bottom + margin;
    }
    if (top + popH > vh - margin) top = vh - popH - margin;
    if (top < margin) top = margin;
  } else if (place === 'top') {
    top = rect.top - popH - margin;
    left = Math.min(Math.max(margin, rect.left + rect.width / 2 - popW / 2), vw - popW - margin);
    if (top < margin) {
      top = rect.bottom + margin;
    }
  } else {
    top = rect.bottom + margin;
    left = Math.min(Math.max(margin, rect.left + rect.width / 2 - popW / 2), vw - popW - margin);
    if (top + popH > vh - margin) {
      top = rect.top - popH - margin;
    }
  }

  left = Math.min(Math.max(margin, left), vw - popW - margin);
  top = Math.min(Math.max(margin, top), vh - margin);
  return { top, left, width: popW };
}

export default function PortalTour({ steps, portal, onComplete }: PortalTourProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popover, setPopover] = useState<PopoverLayout | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const total = steps.length;

  const finishAll = useCallback(async () => {
    try {
      await postTourComplete(portal);
    } catch {
      /* */
    }
    onComplete();
  }, [onComplete, portal]);

  const dismiss = useCallback(() => {
    setDone(true);
    setTargetRect(null);
    void finishAll();
  }, [finishAll]);

  useLayoutEffect(() => {
    if (done) return;
    if (steps.length === 0) {
      setDone(true);
      void finishAll();
      return;
    }
    let resolved = index;
    while (resolved < steps.length) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${steps[resolved].targetId}"]`);
      if (el) break;
      resolved++;
    }
    if (resolved >= steps.length) {
      setDone(true);
      void finishAll();
      return;
    }
    if (resolved !== index) {
      setIndex(resolved);
      return;
    }
    const current = steps[resolved];
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.targetId}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    const popW = Math.min(320, window.innerWidth - 24);
    const popH = popoverRef.current?.offsetHeight ?? 220;
    setPopover(layoutPopover(rect, current.placement, popW, popH));
  }, [steps, index, finishAll, done]);

  useEffect(() => {
    if (done) return;
    const onResize = () => {
      if (!step) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.targetId}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const popW = Math.min(320, window.innerWidth - 24);
      const popH = popoverRef.current?.offsetHeight ?? 220;
      setPopover(layoutPopover(rect, step.placement, popW, popH));
    };
    window.addEventListener('scroll', onResize, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('resize', onResize);
    };
  }, [step, done]);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss, done]);

  if (done || !step || total === 0) return null;

  const goNext = async () => {
    if (index >= total - 1) {
      setDone(true);
      setTargetRect(null);
      await finishAll();
      return;
    }
    setIndex((i) => i + 1);
  };

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const pad = 6;
  const hl = targetRect
    ? {
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  return (
    <>
      <button
        type="button"
        className="wa-fixed wa-inset-0 wa-z-[90] wa-cursor-default wa-border-0 wa-bg-slate-900/50 wa-p-0"
        aria-label="Close tour"
        onClick={() => dismiss()}
      />
      {hl ? (
        <div
          className="wa-pointer-events-none wa-fixed wa-z-[95] wa-rounded-md wa-ring-2 wa-ring-brand-accent wa-ring-offset-2 wa-ring-offset-white dark:wa-ring-offset-slate-900"
          style={{
            top: hl.top,
            left: hl.left,
            width: hl.width,
            height: hl.height,
            transition: 'top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease',
          }}
          aria-hidden
        />
      ) : null}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-portal-tour-title"
        className="wa-fixed wa-z-[100] wa-rounded-xl wa-border wa-border-slate-200 wa-bg-white wa-shadow-xl wa-outline-none dark:wa-border-slate-600 dark:wa-bg-slate-900"
        style={
          popover
            ? { top: popover.top, left: popover.left, width: popover.width, maxWidth: 'calc(100vw - 24px)' }
            : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(320px, 92vw)' }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wa-rounded-t-xl wa-bg-brand-primary wa-px-4 wa-py-3">
          <h2 id="wa-portal-tour-title" className="wa-text-base wa-font-semibold wa-text-white">
            {step.title}
          </h2>
          <p className="wa-mt-1 wa-text-xs wa-font-medium wa-text-white/90">
            {index + 1} of {total}
          </p>
        </div>
        <div className="wa-px-4 wa-py-3 wa-text-sm wa-leading-relaxed wa-text-slate-800 dark:wa-text-slate-100">
          {step.body}
        </div>
        <div className="wa-border-t wa-border-slate-100 wa-px-4 wa-py-3 dark:wa-border-slate-700">
          <div className="wa-flex wa-flex-col wa-gap-3 sm:wa-flex-row sm:wa-items-center sm:wa-justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={index === 0}
              className="wa-order-1 wa-rounded-lg wa-border wa-border-slate-200 wa-bg-white wa-px-3 wa-py-2 wa-text-sm wa-font-medium wa-text-slate-800 disabled:wa-opacity-40 dark:wa-border-slate-600 dark:wa-bg-slate-800 dark:wa-text-slate-100 sm:wa-order-none"
            >
              Back
            </button>
            <div className="wa-order-3 wa-flex wa-w-full wa-flex-wrap wa-items-center wa-justify-stretch wa-gap-2 sm:wa-order-2 sm:wa-w-auto sm:wa-justify-end">
              <button
                type="button"
                onClick={() => dismiss()}
                className="wa-min-h-[40px] wa-flex-1 wa-rounded-lg wa-border wa-border-slate-200 wa-bg-slate-50 wa-px-3 wa-py-2 wa-text-sm wa-font-medium wa-text-slate-600 wa-transition-colors hover:wa-bg-slate-100 hover:wa-text-slate-800 dark:wa-border-slate-600 dark:wa-bg-slate-800/80 dark:wa-text-slate-300 dark:hover:wa-bg-slate-800 dark:hover:wa-text-slate-100 sm:wa-flex-initial"
              >
                Skip tour
              </button>
              <button
                type="button"
                onClick={() => void goNext()}
                className="wa-min-h-[40px] wa-flex-1 wa-rounded-lg wa-bg-brand-accent wa-px-4 wa-py-2 wa-text-sm wa-font-semibold wa-text-white hover:wa-bg-brand-accent-dark sm:wa-flex-initial"
              >
                {index >= total - 1 ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
