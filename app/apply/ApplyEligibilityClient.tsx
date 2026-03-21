'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const APPLY_STORAGE_KEY = 'apply_eligibility';

export default function ApplyEligibilityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');
  const [q1, setQ1] = useState<'yes' | 'no' | null>(null);
  const [q2, setQ2] = useState<'yes' | 'no' | null>(null);
  const [q3, setQ3] = useState<'yes' | 'no' | null>(null);

  const canContinue = q1 !== null && q2 !== null && q3 !== null;
  const qualifies = q1 === 'yes' && q2 === 'yes' && q3 === 'yes';

  const handleContinue = () => {
    if (!canContinue) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(APPLY_STORAGE_KEY, JSON.stringify({ q1, q2, q3, qualifies }));
    }
    const resultsUrl = programParam ? `/apply/results?program=${encodeURIComponent(programParam)}` : '/apply/results';
    router.push(resultsUrl);
  };

  return (
      <div className="apply-flow">
      <div className="apply-progress-bar">
        <div className="apply-progress-fill" style={{ width: '33%' }} />
        <p className="apply-progress-label">Step 1 of 3</p>
      </div>

      <div className="apply-step-content">
        <h2 className="apply-step-title">Quick check — we want to help you find the right fit</h2>
        <p className="apply-step-desc">These answers help us point you to the right program and funding options. Everyone who applies gets a personal response.</p>

        <div className="funding-questions">
          <div className="form-group">
            <label>Are you currently unemployed or underemployed?</label>
            <div className="form-radio-cards">
              <label className={`form-radio-card ${q1 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q1" value="yes" checked={q1 === 'yes'} onChange={() => setQ1('yes')} />
                <span className="radio-dot" />
                <span>Yes</span>
              </label>
              <label className={`form-radio-card ${q1 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q1" value="no" checked={q1 === 'no'} onChange={() => setQ1('no')} />
                <span className="radio-dot" />
                <span>No</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Is your household income below $60,000/year?</label>
            <div className="form-radio-cards">
              <label className={`form-radio-card ${q2 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q2" value="yes" checked={q2 === 'yes'} onChange={() => setQ2('yes')} />
                <span className="radio-dot" />
                <span>Yes</span>
              </label>
              <label className={`form-radio-card ${q2 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q2" value="no" checked={q2 === 'no'} onChange={() => setQ2('no')} />
                <span className="radio-dot" />
                <span>No</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Are you a US resident?</label>
            <div className="form-radio-cards">
              <label className={`form-radio-card ${q3 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q3" value="yes" checked={q3 === 'yes'} onChange={() => setQ3('yes')} />
                <span className="radio-dot" />
                <span>Yes</span>
              </label>
              <label className={`form-radio-card ${q3 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q3" value="no" checked={q3 === 'no'} onChange={() => setQ3('no')} />
                <span className="radio-dot" />
                <span>No</span>
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

export { APPLY_STORAGE_KEY };
