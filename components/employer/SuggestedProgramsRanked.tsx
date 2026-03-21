'use client';

import { useCallback, useMemo, useState, type RefObject } from 'react';
import { rankProgramsForEmployerJob, type RankedProgramMatch } from '@/lib/employer/rankProgramsForEmployerJob';

type SuggestedProgramsRankedProps = {
  formRef: RefObject<HTMLFormElement | null>;
  programSlugs: string[];
  defaultSelected: string[];
  /** Seed text before the form is read (import / edit initial values). */
  initialHaystack: string;
  disabled?: boolean;
};

function readHaystack(form: HTMLFormElement | null): string {
  if (!form) return '';
  const title = (form.elements.namedItem('title') as HTMLInputElement | null)?.value ?? '';
  const description = (form.elements.namedItem('description') as HTMLTextAreaElement | null)?.value ?? '';
  const requirements = (form.elements.namedItem('requirements') as HTMLTextAreaElement | null)?.value ?? '';
  return `${title} ${description} ${requirements}`;
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
  const [haystack, setHaystack] = useState(() => initialHaystack.trim());

  const rerankFromForm = useCallback(() => {
    setHaystack(readHaystack(formRef.current).trim() || initialHaystack.trim());
  }, [formRef, initialHaystack]);

  const ranked = useMemo(() => {
    const h = haystack.length >= 8 ? haystack : initialHaystack;
    return rankProgramsForEmployerJob(h, programSlugs);
  }, [haystack, initialHaystack, programSlugs]);

  const top = ranked.slice(0, 7);
  const rest = ranked.slice(7);

  return (
    <fieldset className="employer-job-form-fieldset employer-job-form-programs employer-suggested-programs">
      <legend>Training matches for this role</legend>
      <p className="employer-job-form-hint">
        We rank tracks by how your title and description read — not checkboxes for the sake of it. Select any that
        represent real hiring paths; we use this to surface certify-ready candidates, not to block applicants.
      </p>
      <div className="employer-suggested-programs__toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={rerankFromForm} disabled={disabled}>
          Update ranking from draft
        </button>
        <span className="employer-suggested-programs__toolbar-hint">Run after you edit title, description, or requirements.</span>
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
                defaultChecked={defaultSelected.includes(r.slug)}
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
        <>
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
                      defaultChecked={defaultSelected.includes(r.slug)}
                      disabled={disabled}
                    />
                    <span className="employer-suggested-programs__title">{r.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </fieldset>
  );
}
