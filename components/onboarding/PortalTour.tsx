'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTour } from './TourContext';
import { scrollBehavior } from '@/lib/a11y/scrollBehavior';

export interface TourStep {
  targetId: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

type PopoverLayout = { top: number; left: number; width: number };

function layoutPopover(
  rect: DOMRect,
  placement: TourStep['placement'],
  popW: number,
  popH: number
): PopoverLayout {
  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const place = placement ?? 'right';
  let top = rect.bottom + margin;
  let left = rect.left;

  // On narrow screens, prefer bottom-center to avoid clipping
  const narrow = vw < 640;

  if (narrow) {
    top = rect.bottom + margin;
    left = Math.min(Math.max(margin, rect.left + rect.width / 2 - popW / 2), vw - popW - margin);
    if (top + popH > vh - margin) {
      top = rect.top - popH - margin;
    }
    if (top < margin) {
      top = margin;
      left = Math.min(Math.max(margin, vw / 2 - popW / 2), vw - popW - margin);
    }
    return { top, left, width: popW };
  }

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

export default function PortalTour() {
  const { isOpen, currentStep, steps, endTour, completeTour, nextStep, prevStep, goToStep } = useTour();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popover, setPopover] = useState<PopoverLayout | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const total = steps.length;
  const step = steps[currentStep];

  useLayoutEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }
    if (steps.length === 0) {
      void completeTour();
      return;
    }
    let resolved = currentStep;
    while (resolved < steps.length) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${steps[resolved].targetId}"]`);
      if (el) break;
      resolved++;
    }
    if (resolved >= steps.length) {
      void completeTour();
      return;
    }
    if (resolved !== currentStep) {
      queueMicrotask(() => goToStep(resolved));
      return;
    }

    const current = steps[resolved];
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.targetId}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scrollBehavior() });
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    const popW = Math.min(340, window.innerWidth - 24);
    const popH = popoverRef.current?.offsetHeight ?? 240;
    setPopover(layoutPopover(rect, current.placement, popW, popH));
  }, [isOpen, steps, currentStep, completeTour, goToStep]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      if (!step) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.targetId}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const popW = Math.min(340, window.innerWidth - 24);
      const popH = popoverRef.current?.offsetHeight ?? 240;
      setPopover(layoutPopover(rect, step.placement, popW, popH));
    };
    window.addEventListener('scroll', onResize, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('resize', onResize);
    };
  }, [step, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [endTour, isOpen]);

  if (!isOpen || !step || total === 0) return null;

  const pad = 8;
  const hl = targetRect
    ? {
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  const isLastStep = currentStep >= total - 1;

  return (
    <div className="wa-pointer-events-auto">
      {/* Dimmed overlay */}
      <button
        type="button"
        className="wa-fixed wa-inset-0 wa-z-[var(--z-tour)] wa-cursor-default wa-border-0 wa-p-0"
        aria-label="Close tour"
        onClick={() => endTour()}
        style={{
          background: 'rgba(18, 20, 22, 0.65)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Spotlight ring */}
      {hl ? (
        <div
          className="wa-pointer-events-none wa-fixed wa-z-[calc(var(--z-tour)_+_5)] wa-rounded-lg"
          style={{
            top: hl.top,
            left: hl.left,
            width: hl.width,
            height: hl.height,
            boxShadow: '0 0 0 9999px rgba(18, 20, 22, 0.65), 0 0 0 4px var(--color-accent)',
            transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
          }}
          aria-hidden
        />
      ) : null}

      {/* Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-portal-tour-title"
        className="wa-fixed wa-z-[calc(var(--z-tour)_+_10)] wa-rounded-xl wa-outline-none"
        style={{
          top: popover?.top ?? '50%',
          left: popover?.left ?? '50%',
          transform: popover ? undefined : 'translate(-50%, -50%)',
          width: popover?.width ?? 'min(340px, 92vw)',
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--surface-container-high)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          color: 'var(--color-on-surface)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="wa-rounded-t-xl wa-px-4 wa-py-3"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
          }}
        >
          <h2 id="wa-portal-tour-title" className="wa-text-base wa-font-semibold" style={{ color: '#fff' }}>
            {step.title}
          </h2>
          <p className="wa-mt-1 wa-text-xs wa-font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Step {currentStep + 1} of {total}
          </p>
        </div>

        {/* Body */}
        <div className="wa-px-4 wa-py-4 wa-text-sm wa-leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
          {step.body}
        </div>

        {/* Footer */}
        <div
          className="wa-px-4 wa-py-3"
          style={{ borderTop: '1px solid var(--surface-container-high)' }}
        >
          <div className="wa-flex wa-flex-col wa-gap-3 sm:wa-flex-row sm:wa-items-center sm:wa-justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="wa-order-1 wa-rounded-lg wa-border wa-px-3 wa-py-2 wa-text-sm wa-font-medium disabled:wa-opacity-40 sm:wa-order-none"
              style={{
                background: 'var(--surface-container-low)',
                borderColor: 'var(--surface-container-high)',
                color: 'var(--color-on-surface)',
              }}
            >
              Back
            </button>
            <div className="wa-order-3 wa-flex wa-w-full wa-flex-wrap wa-items-center wa-justify-stretch wa-gap-2 sm:wa-order-2 sm:wa-w-auto sm:wa-justify-end">
              <button
                type="button"
                onClick={() => endTour()}
                className="wa-min-h-[40px] wa-flex-1 wa-rounded-lg wa-border wa-px-3 wa-py-2 wa-text-sm wa-font-medium wa-transition-colors sm:wa-flex-initial"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--surface-container-high)',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                Skip tour
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    void completeTour();
                  } else {
                    nextStep();
                  }
                }}
                className="wa-min-h-[40px] wa-flex-1 wa-rounded-lg wa-px-4 wa-py-2 wa-text-sm wa-font-semibold wa-text-white wa-transition-colors sm:wa-flex-initial"
                style={{
                  background: 'var(--color-accent)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-dark)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent)';
                }}
              >
                {isLastStep ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
