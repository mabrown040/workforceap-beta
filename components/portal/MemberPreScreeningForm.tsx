'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import HearAboutSelect from '@/components/apply/HearAboutSelect';
import { hearAboutNeedsOther } from '@/lib/apply/eligibilityExtendedFields';

const EMPLOYMENT = ['Employed', 'Unemployed', 'Underemployed', 'Student'] as const;
const GOALS = ['New career', 'Promotion', 'Certification', 'Exploring options'] as const;
const HOURS = ['<5 hrs', '5-10 hrs', '10-20 hrs', '20+ hrs'] as const;

type DraftPayload = {
  employmentStatus: string;
  primaryGoal: string;
  weeklyHours: string;
  barrier: string;
  hearAbout: string;
  hearAboutOther: string;
  workforceAssistance: 'yes' | 'no' | '';
  phone: string;
  address: string;
};

export default function MemberPreScreeningForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<string>(EMPLOYMENT[1]);
  const [primaryGoal, setPrimaryGoal] = useState<string>(GOALS[0]);
  const [weeklyHours, setWeeklyHours] = useState<string>(HOURS[2]);
  const [barrier, setBarrier] = useState('');
  const [hearAbout, setHearAbout] = useState<string>('');
  const [hearAboutOther, setHearAboutOther] = useState('');
  const [workforceAssistance, setWorkforceAssistance] = useState<'yes' | 'no' | ''>('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const skipNextAutosave = useRef(true);

  const buildBody = useCallback((): DraftPayload => {
    return {
      employmentStatus,
      primaryGoal,
      weeklyHours,
      barrier,
      hearAbout,
      hearAboutOther,
      workforceAssistance,
      phone,
      address,
    };
  }, [
    employmentStatus,
    primaryGoal,
    weeklyHours,
    barrier,
    hearAbout,
    hearAboutOther,
    workforceAssistance,
    phone,
    address,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/member/pre-screening/draft');
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) {
          if (!cancelled) setDraftHydrated(true);
          return;
        }
        const d = data.draft as {
          employmentStatus: string | null;
          primaryGoal: string | null;
          weeklyHours: string | null;
          barrier: string | null;
          hearAbout: string | null;
          hearAboutOther: string | null;
          workforceAssistance: boolean | null;
          phone: string | null;
          address: string | null;
        } | null;
        if (d) {
          if (d.employmentStatus && EMPLOYMENT.includes(d.employmentStatus as (typeof EMPLOYMENT)[number])) {
            setEmploymentStatus(d.employmentStatus);
          }
          if (d.primaryGoal && GOALS.includes(d.primaryGoal as (typeof GOALS)[number])) {
            setPrimaryGoal(d.primaryGoal);
          }
          if (d.weeklyHours && HOURS.includes(d.weeklyHours as (typeof HOURS)[number])) {
            setWeeklyHours(d.weeklyHours);
          }
          if (d.barrier != null) setBarrier(d.barrier);
          if (d.hearAbout) {
            setHearAbout(d.hearAbout);
          }
          if (d.hearAboutOther != null) setHearAboutOther(d.hearAboutOther);
          if (d.workforceAssistance === true) setWorkforceAssistance('yes');
          else if (d.workforceAssistance === false) setWorkforceAssistance('no');
          if (d.phone != null) setPhone(d.phone);
          if (d.address != null) setAddress(d.address);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          skipNextAutosave.current = true;
          setDraftHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const body = buildBody();
    const t = setTimeout(async () => {
      setDraftSaveState('saving');
      try {
        const res = await fetch('/api/member/pre-screening/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setDraftSaveState('saved');
          setDraftSavedAt(new Date());
        } else {
          setDraftSaveState('error');
        }
      } catch {
        setDraftSaveState('error');
      }
    }, 550);
    return () => clearTimeout(t);
  }, [draftHydrated, buildBody]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/member/pre-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employmentStatus,
          primaryGoal,
          weeklyHours,
          barrier: barrier.trim(),
          hearAbout,
          hearAboutOther: hearAboutNeedsOther(hearAbout) ? hearAboutOther.trim() || null : null,
          workforceAssistance: workforceAssistance === 'yes',
          phone: phone.trim(),
          address: address.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Submit failed');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Submit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const draftHint =
    draftSaveState === 'saving'
      ? 'Saving draft…'
      : draftSaveState === 'error'
        ? 'Could not save draft. Check your connection.'
        : draftSavedAt
          ? `Draft saved ${draftSavedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
          : 'Draft saves automatically as you type.';

  // Count completed required fields for progress indicator
  const totalFields = hearAboutNeedsOther(hearAbout) ? 9 : 8;
  const adjustedCompleted = [
    !!employmentStatus,
    !!primaryGoal,
    !!weeklyHours,
    !!barrier.trim(),
    !!hearAbout,
    hearAboutNeedsOther(hearAbout) ? !!hearAboutOther.trim() : null,
    !!phone.trim(),
    !!address.trim(),
    workforceAssistance !== '',
  ].filter((v) => v === true).length;
  const progressPct = Math.round((adjustedCompleted / totalFields) * 100);
  const isComplete = adjustedCompleted >= totalFields;

  return (
    <form onSubmit={handleSubmit} className="member-prescreen-form">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        A few questions so your counselor can prepare for your interview. All fields are required to submit.
      </p>
      <div className="member-prescreen-progress" aria-live="polite">
        <p className="member-prescreen-progress-title">Form progress</p>
        <div className="member-prescreen-progress-row">
          <span className="member-prescreen-progress-text">
            {isComplete ? '✓ All fields complete — ready to submit' : `${adjustedCompleted} of ${totalFields} fields complete`}
          </span>
          <span className="member-prescreen-progress-text">{progressPct}%</span>
        </div>
        <div className="member-prescreen-progress-track">
          <div
            className="member-prescreen-progress-fill"
            style={{
              width: `${progressPct}%`,
              background: isComplete ? 'var(--color-success, #16a34a)' : 'var(--color-accent)',
            }}
            role="progressbar"
            aria-label="Pre-screening completion"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
      <p
        className="member-prescreen-draft-hint"
        style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}
        aria-live="polite"
      >
        {draftHint}
      </p>
      <div className="form-group">
        <label htmlFor="emp">Current employment status</label>
        <select id="emp" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} required>
          {EMPLOYMENT.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="goal">Primary goal</label>
        <select id="goal" value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} required>
          {GOALS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="hrs">Time you can commit weekly</label>
        <select id="hrs" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} required>
          {HOURS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="barrier">Biggest barrier right now (max 200 characters)</label>
        <textarea
          id="barrier"
          rows={3}
          maxLength={200}
          value={barrier}
          onChange={(e) => setBarrier(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="hear">How did you hear about us?</label>
        <HearAboutSelect id="hear" value={hearAbout} onChange={setHearAbout} required />
      </div>
      {hearAboutNeedsOther(hearAbout) ? (
        <div className="form-group">
          <label htmlFor="hearOther">Please specify</label>
          <input id="hearOther" value={hearAboutOther} onChange={(e) => setHearAboutOther(e.target.value)} required />
        </div>
      ) : null}
      <div className="form-group">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={10} />
      </div>
      <div className="form-group">
        <label htmlFor="addr">Physical address (street, city, state)</label>
        <input id="addr" type="text" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} required minLength={5} />
      </div>
      <fieldset className="form-group">
        <legend style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
          Are you currently receiving any workforce assistance?
        </legend>
        <label style={{ display: 'inline-flex', gap: '0.35rem', marginRight: '1rem' }}>
          <input
            type="radio"
            name="wa"
            checked={workforceAssistance === 'yes'}
            onChange={() => setWorkforceAssistance('yes')}
            required
          />
          Yes
        </label>
        <label style={{ display: 'inline-flex', gap: '0.35rem' }}>
          <input
            type="radio"
            name="wa"
            checked={workforceAssistance === 'no'}
            onChange={() => setWorkforceAssistance('no')}
            required
          />
          No
        </label>
      </fieldset>
      <button type="submit" className="btn btn-primary" disabled={loading || workforceAssistance === ''}>
        {loading ? 'Submitting…' : 'Submit pre-screening'}
      </button>
    </form>
  );
}
