'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { rankProgramsForEmployerJob, type RankedProgramMatch } from '@/lib/employer/rankProgramsForEmployerJob';

type SuggestedProgramsRankedProps = {
  formRef: RefObject<HTMLFormElement | null>;
  programSlugs: string[];
  defaultSelected: string[];
  /** Seed text before the form is read (import / edit initial values). */
  initialHaystack: string;
  disabled?: boolean;
};

type RefreshState = 'idle' | 'refreshing' | 'updated';

function readTrackedValues(form: HTMLFormElement | null): string {
  if (!form) return '';
  const title = (form.elements.namedItem('title') as HTMLInputElement | null)?.value ?? '';
  const description = (form.elements.namedItem('description') as HTMLTextAreaElement | null)?.value ?? '';
  const requirements = (form.elements.namedItem('requirements') as HTMLTextAreaElement | null)?.value ?? '';
  return `${title} ${description} ${requirements}`.trim();
}

function readSelectedPrograms(form: HTMLFormElement | null): string[] {
  if (!form) return [];
  return Array.from(form.querySelectorAll<HTMLInputElement>('input[name="suggestedPrograms"]:checked')).map(
    (input) => input.value,
  );
}

function confidenceLabel(c: RankedProgramMatch['confidence']): string {
  if (c === 'strong') return 'Strong match';
  if (c === 'good') return 'Good match';
  return 'Consider';
}

export default function SuggestedProgramsRanked({
  formRef,
  programSlugs,
  defaultSelected,
  initialHaystack,
  disabled = false,
}: SuggestedProgramsRankedProps) {
  const fallbackHaystack = initialHaystack.trim();
  const [haystack, setHaystack] = useState(() => fallbackHaystack);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(defaultSelected);
  const [refreshState, setRefreshState] = useState<RefreshState>('updated');
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('Updated just now');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHaystackRef = useRef(fallbackHaystack);

  const applyRerank = useCallback(
    (nextHaystack: string, nextSelectedPrograms?: string[]) => {
      const normalizedHaystack = nextHaystack.trim() || fallbackHaystack;
      const normalizedSelectedPrograms = nextSelectedPrograms ?? readSelectedPrograms(formRef.current);

      latestHaystackRef.current = normalizedHaystack;
      setHaystack((current) => (current === normalizedHaystack ? current : normalizedHaystack));
      setSelectedPrograms(normalizedSelectedPrograms);
      setRefreshState('updated');
      setLastUpdatedLabel('Updated just now');

      if (updatedLabelTimerRef.current) {
        clearTimeout(updatedLabelTimerRef.current);
      }

      updatedLabelTimerRef.current = setTimeout(() => {
        setLastUpdatedLabel('Updated moments ago');
      }, 4000);
    },
    [fallbackHaystack, formRef],
  );

  const rerankFromForm = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    applyRerank(readTrackedValues(formRef.current), readSelectedPrograms(formRef.current));
  }, [applyRerank, formRef]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const trackedFields = [
      form.elements.namedItem('title'),
      form.elements.namedItem('description'),
      form.elements.namedItem('requirements'),
    ].filter((field): field is HTMLInputElement | HTMLTextAreaElement => field instanceof HTMLElement);

    if (trackedFields.length === 0) return;

    const scheduleRerank = () => {
      const nextHaystack = readTrackedValues(form);
      if (nextHaystack === latestHaystackRef.current) return;

      setRefreshState('refreshing');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        applyRerank(nextHaystack, readSelectedPrograms(form));
      }, 500);
    };

    trackedFields.forEach((field) => field.addEventListener('input', scheduleRerank));

    return () => {
      trackedFields.forEach((field) => field.removeEventListener('input', scheduleRerank));
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [applyRerank, formRef]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (updatedLabelTimerRef.current) clearTimeout(updatedLabelTimerRef.current);
    };
  }, []);

  const ranked = useMemo(() => {
    const h = haystack.length >= 8 ? haystack : fallbackHaystack;
    return rankProgramsForEmployerJob(h, programSlugs);
  }, [haystack, fallbackHaystack, programSlugs]);

  const selectedProgramSet = useMemo(() => new Set(selectedPrograms), [selectedPrograms]);
  const top = ranked.slice(0, 7);
  const rest = ranked.slice(7);

  const handleProgramToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = event.currentTarget;
    setSelectedPrograms((current) => {
      if (checked) {
        return current.includes(value) ? current : [...current, value];
      }
      return current.filter((slug) => slug !== value);
    });
  }, []);

  return (
    <fieldset className="employer-job-form-fieldset employer-job-form-programs employer-suggested-programs">
      <legend>Training matches for this role</legend>
      <p className="employer-job-form-hint">
        Rankings reflect keywords in your title, description, and requirements — a practical map to our training
        tracks, not a guarantee. Select tracks that match real roles you hire for; we use them to surface
        certification-aligned candidates for your review.
      </p>
      <div className="employer-suggested-programs__toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={rerankFromForm} disabled={disabled}>
          Refresh recommendations
        </button>
        <span className="employer-suggested-programs__toolbar-hint" aria-live="polite">
          {refreshState === 'refreshing' ? 'Refreshing recommendations…' : lastUpdatedLabel}
        </span>
      </div>

      <div className="employer-suggested-programs__section-label">Recommended first</div>
      <ul className="employer-suggested-programs__list" role="list">
        {top.map((r) => (
          <li key={r.slug}>
            <label className="employer-suggested-programs__row">
              <input
                type="checkbox"
                name="suggestedPrograms"
                value={r.slug}
                checked={selectedProgramSet.has(r.slug)}
                onChange={handleProgramToggle}
                disabled={disabled}
              />
              <span className={`employer-suggested-programs__badge employer-suggested-programs__badge--${r.confidence}`}>
                {confidenceLabel(r.confidence)}
              </span>
              <span className="employer-suggested-programs__body">
                <span className="employer-suggested-programs__title">{r.title}</span>
                <span className="employer-suggested-programs__why">{r.rationale}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="employer-suggested-programs__more">
          <summary>More tracks ({rest.length})</summary>
          <ul className="employer-suggested-programs__list employer-suggested-programs__list--compact" role="list">
            {rest.map((r) => (
              <li key={r.slug}>
                <label className="employer-suggested-programs__row employer-suggested-programs__row--compact">
                  <input
                    type="checkbox"
                    name="suggestedPrograms"
                    value={r.slug}
                    checked={selectedProgramSet.has(r.slug)}
                    onChange={handleProgramToggle}
                    disabled={disabled}
                  />
                  <span className="employer-suggested-programs__title">{r.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </fieldset>
  );
}
