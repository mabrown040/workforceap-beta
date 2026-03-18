'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Program } from '@/lib/content/programs';
import { formatPhone } from '@/lib/formatPhone';

const EMPLOYMENT = ['Unemployed', 'Underemployed', 'Employed', 'Self-Employed'];
const VETERAN = ['Not a Veteran', 'Veteran', 'Disabled Veteran'];
const INCOME = ['Under $20K', '$20K–$40K', '$40K–$60K', 'Over $60K'];
const EDUCATION = ['Less than HS', 'HS Diploma or GED', 'Some College', "Associate's", "Bachelor's", 'Graduate'];
const REFERRAL = ['Referral', 'Community Event', 'Social Media', 'Workforce Solutions', 'TWC', 'Church', 'Other'];
const ETHNICITY = [
  'Hispanic/Latino', 'White', 'Black or African American', 'Asian',
  'American Indian or Alaska Native', 'Native Hawaiian or Pacific Islander', 'Two or More Races',
];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  employmentStatus: string;
  veteranStatus: string;
  householdIncome: string;
  educationLevel: string;
  referralSource: string;
  notes: string;
  usCitizen: boolean;
  authorizedToWork: boolean;
  hasDisability: boolean;
  ethnicity: string;
  programSlug: string;
  programNotes: string;
};

const initialForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  dob: '',
  employmentStatus: '',
  veteranStatus: '',
  householdIncome: '',
  educationLevel: '',
  referralSource: '',
  notes: '',
  usCitizen: false,
  authorizedToWork: false,
  hasDisability: false,
  ethnicity: '',
  programSlug: '',
  programNotes: '',
};

type Props = { programs: Program[] };

export default function AddMemberWizard({ programs }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [enhancedResume, setEnhancedResume] = useState('');
  const [improvementSummary, setImprovementSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState<'parse' | 'enhance' | 'create' | null>(null);
  const [error, setError] = useState('');

  const update = (k: keyof FormData, v: FormData[keyof FormData]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setError('');
    setLoading('parse');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/extract-resume-text', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.text) {
        setResumeText(data.text);
        const parseRes = await fetch('/api/admin/members/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume: data.text }),
        });
        const parseData = await parseRes.json();
        if (parseRes.ok && parseData.extracted) {
          const ex = parseData.extracted as Record<string, unknown>;
          if (ex.extracted_name) update('firstName', (ex.extracted_name as string).split(' ')[0] || '');
          if (ex.extracted_name) update('lastName', (ex.extracted_name as string).split(' ').slice(1).join(' ') || '');
          if (ex.extracted_email) update('email', ex.extracted_email as string);
          if (ex.extracted_phone) update('phone', ex.extracted_phone as string);
        }
      } else setError(data.error ?? 'Could not extract text');
    } catch {
      setError('Upload failed');
    } finally {
      setLoading(null);
      e.target.value = '';
    }
  };

  const handleEnhance = async () => {
    if (!resumeText || !form.programSlug) return;
    setLoading('enhance');
    setError('');
    try {
      const program = programs.find((p) => p.slug === form.programSlug);
      const res = await fetch('/api/admin/members/enhance-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText, programTitle: program?.title ?? form.programSlug }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnhancedResume(data.enhancedResume ?? '');
        setImprovementSummary(data.improvementSummary ?? []);
      } else setError(data.error ?? 'Enhancement failed');
    } catch {
      setError('Enhancement failed');
    } finally {
      setLoading(null);
    }
  };

  const handleSubmit = async () => {
    setLoading('create');
    setError('');
    try {
      const payload = {
        ...form,
        usCitizen: form.usCitizen,
        authorizedToWork: form.authorizedToWork,
        hasDisability: form.hasDisability,
      };
      const res = await fetch('/api/admin/members/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create member');
        setLoading(null);
        return;
      }
      const userId = data.userId;
      if (userId && (resumeFile || enhancedResume)) {
        const fd = new FormData();
        if (resumeFile) fd.append('resumeOriginal', resumeFile);
        if (enhancedResume) fd.append('resumeEnhanced', enhancedResume);
        await fetch(`/api/admin/members/${userId}/upload-resume`, { method: 'POST', body: fd });
      }
      router.push(`/admin/members/${userId}`);
      router.refresh();
    } catch {
      setError('Failed to create member');
    } finally {
      setLoading(null);
    }
  };

  const canProceedStep1 = form.firstName && form.email && form.employmentStatus && form.educationLevel &&
    form.usCitizen && form.authorizedToWork;
  const canProceedStep2 = !!form.programSlug;
  const maxStep = 4;

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            style={{
              padding: '0.5rem 1rem',
              border: step === s ? '2px solid var(--color-accent)' : '1px solid #ccc',
              borderRadius: '6px',
              background: step === s ? 'rgba(74,155,79,0.1)' : 'white',
              cursor: 'pointer',
              fontWeight: step === s ? 600 : 400,
            }}
          >
            Step {s}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#fee', borderRadius: '6px', color: '#c00' }}>
          {error}
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <section style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
          <h2 style={{ marginBottom: '1rem' }}>Basic Info</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>First Name *</label>
              <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            </div>
            <div>
              <label>Last Name *</label>
              <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
            <div>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div>
              <label>Phone *</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Address (optional)</label>
              <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
            <div>
              <label>Date of Birth (optional)</label>
              <input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
            </div>
            <div>
              <label>Employment Status *</label>
              <select value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)} required>
                <option value="">Select…</option>
                {EMPLOYMENT.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label>Veteran Status</label>
              <select value={form.veteranStatus} onChange={(e) => update('veteranStatus', e.target.value)}>
                <option value="">Select…</option>
                {VETERAN.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label>Household Income</label>
              <select value={form.householdIncome} onChange={(e) => update('householdIncome', e.target.value)}>
                <option value="">Select…</option>
                {INCOME.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label>Education Level *</label>
              <select value={form.educationLevel} onChange={(e) => update('educationLevel', e.target.value)} required>
                <option value="">Select…</option>
                {EDUCATION.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>How did they hear about WorkforceAP?</label>
              <select value={form.referralSource} onChange={(e) => update('referralSource', e.target.value)}>
                <option value="">Select…</option>
                {REFERRAL.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Notes (internal)</label>
              <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
            </div>
          </div>
          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>WIOA / State of Texas</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.usCitizen} onChange={(e) => update('usCitizen', e.target.checked)} />
              US Citizen or Permanent Resident? *
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.authorizedToWork} onChange={(e) => update('authorizedToWork', e.target.checked)} />
              Authorized to work in the US? *
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.hasDisability} onChange={(e) => update('hasDisability', e.target.checked)} />
              Has a disability?
            </label>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label>Ethnicity</label>
            <select value={form.ethnicity} onChange={(e) => update('ethnicity', e.target.value)}>
              <option value="">Select…</option>
              {ETHNICITY.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Next: Program Selection →
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Program Selection */}
      {step === 2 && (
        <section style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
          <h2 style={{ marginBottom: '1rem' }}>Program Selection</h2>
          <p style={{ marginBottom: '1rem', color: '#666' }}>Select the program for this member.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {programs.map((p) => (
              <div
                key={p.slug}
                onClick={() => update('programSlug', p.slug)}
                style={{
                  padding: '1rem',
                  border: `2px solid ${form.programSlug === p.slug ? 'var(--color-accent)' : '#ddd'}`,
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{p.icon}</div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{p.title}</h3>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>{p.duration}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)' }}>{p.salary}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label>Why this program? (optional, internal)</label>
            <textarea value={form.programNotes} onChange={(e) => update('programNotes', e.target.value)} rows={2} />
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)} disabled={!canProceedStep2}>
              Next: Resume →
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Resume Upload */}
      {step === 3 && (
        <section style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
          <h2 style={{ marginBottom: '1rem' }}>Resume Upload + AI Enhancement (optional)</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label>Upload resume (PDF, DOC, DOCX, max 5MB)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={!!loading} />
            {loading === 'parse' && <span style={{ marginLeft: '0.5rem' }}>Parsing…</span>}
            {resumeFile && <span style={{ marginLeft: '0.5rem', color: '#666' }}>✓ {resumeFile.name}</span>}
          </div>
          {resumeText && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Original</h3>
                  <pre style={{ padding: '0.75rem', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto' }}>
                    {resumeText.slice(0, 1500)}{resumeText.length > 1500 ? '…' : ''}
                  </pre>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>AI-Enhanced</h3>
                  {enhancedResume ? (
                    <pre style={{ padding: '0.75rem', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto' }}>
                      {enhancedResume.slice(0, 1500)}{enhancedResume.length > 1500 ? '…' : ''}
                    </pre>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={handleEnhance} disabled={!!loading || !form.programSlug}>
                      {loading === 'enhance' ? 'Generating…' : 'Generate Enhanced Resume'}
                    </button>
                  )}
                </div>
              </div>
              {improvementSummary.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e8f5e9', borderRadius: '6px' }}>
                  <strong>Improvement summary:</strong>
                  <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                    {improvementSummary.map((s, i) => <li key={i}>{s.replace(/^[•\-]\s*/, '')}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
              Next: Review →
            </button>
          </div>
        </section>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <section style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' }}>
          <h2 style={{ marginBottom: '1rem' }}>Review & Create</h2>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', marginBottom: '1rem' }}>
            <p><strong>Name:</strong> {form.firstName} {form.lastName}</p>
            <p><strong>Email:</strong> {form.email}</p>
            <p><strong>Phone:</strong> {formatPhone(form.phone)}</p>
            <p><strong>Program:</strong> {programs.find((p) => p.slug === form.programSlug)?.title ?? form.programSlug}</p>
            <p><strong>WIOA:</strong> Citizen {form.usCitizen ? '✓' : '✗'}, Authorized {form.authorizedToWork ? '✓' : '✗'}, Disability {form.hasDisability ? 'Yes' : 'No'}, Ethnicity: {form.ethnicity || '—'}</p>
            <p><strong>Resume:</strong> {resumeFile ? 'Original uploaded' : 'Not uploaded'} {enhancedResume ? '+ Enhanced' : ''}</p>
            {form.notes && <p><strong>Notes:</strong> {form.notes}</p>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!!loading}>
              {loading === 'create' ? 'Creating…' : 'Create Member Account →'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
