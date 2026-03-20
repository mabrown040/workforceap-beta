'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Program } from '@/lib/content/programs';
import { ProgramIcon } from '@/components/ProgramIcon';
import { formatPhone } from '@/lib/formatPhone';
import { ADMIN_REFERRAL_SOURCE_OPTIONS } from '@/lib/referralSources';
import { User, BookOpen, FileText, CheckCircle, Handshake } from 'lucide-react';
import '@/css/counselor.css';

const EMPLOYMENT = ['Unemployed', 'Underemployed', 'Employed', 'Self-Employed'];
const VETERAN = ['Not a Veteran', 'Veteran', 'Disabled Veteran'];
const INCOME = ['Under $20K', '$20K–$40K', '$40K–$60K', 'Over $60K'];
const EDUCATION = ['Less than HS', 'HS Diploma or GED', 'Some College', "Associate's", "Bachelor's", 'Graduate'];
const REFERRAL = [...ADMIN_REFERRAL_SOURCE_OPTIONS];
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
  partnerId: string;
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
  partnerId: '',
};

type PartnerOption = { id: string; name: string };
type Props = { programs: Program[]; partners: PartnerOption[] };

export default function AddMemberWizard({ programs, partners }: Props) {
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
        partnerId: form.partnerId || undefined,
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
      const email = data.email ?? form.email;
      router.push(`/admin/members/${userId}?toast=created&email=${encodeURIComponent(email)}`);
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
  const maxStep = 5;

  const stepLabels = [
    'Basic Info',
    'Program Selection',
    'Partner Referral',
    'Resume Upload',
    'Review & Create',
  ];

  return (
    <div className="wizard-container">
      <div className="wizard-step-indicator">
        <span className="wizard-step-label">Step {step} of 5 — {stepLabels[step - 1]}</span>
        <div className="wizard-step-dots">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`wizard-step-dot ${step === s ? 'active' : ''}`}
              aria-current={step === s ? 'step' : undefined}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#fee', borderRadius: '6px', color: '#c00' }}>
          {error}
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <section className="wizard-step wizard-step-1">
          <h2 className="wizard-section-title"><User size={22} className="wizard-icon" /> Basic Info</h2>
          <div className="wizard-form-grid">
            <div className="wizard-field">
              <label>First Name *</label>
              <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            </div>
            <div className="wizard-field">
              <label>Last Name *</label>
              <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
            <div className="wizard-field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div className="wizard-field">
              <label>Phone *</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="wizard-field wizard-field-full">
              <label>Address (optional)</label>
              <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
            <div className="wizard-field">
              <label>Date of Birth (optional)</label>
              <input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
            </div>
            <div className="wizard-field">
              <label>Employment Status *</label>
              <select value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)} required>
                <option value="">Select…</option>
                {EMPLOYMENT.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="wizard-field">
              <label>Veteran Status</label>
              <select value={form.veteranStatus} onChange={(e) => update('veteranStatus', e.target.value)}>
                <option value="">Select…</option>
                {VETERAN.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="wizard-field">
              <label>Household Income</label>
              <select value={form.householdIncome} onChange={(e) => update('householdIncome', e.target.value)}>
                <option value="">Select…</option>
                {INCOME.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="wizard-field">
              <label>Education Level *</label>
              <select value={form.educationLevel} onChange={(e) => update('educationLevel', e.target.value)} required>
                <option value="">Select…</option>
                {EDUCATION.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="wizard-field wizard-field-full">
              <label>Referral Source</label>
              <select value={form.referralSource} onChange={(e) => update('referralSource', e.target.value)}>
                <option value="">Select…</option>
                {REFERRAL.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="wizard-wioa-card">
            <h3 className="wizard-wioa-title">Workforce Reporting</h3>
            <div className="wizard-wioa-toggles">
              <div className="wizard-toggle-row">
                <label>US Citizen or Permanent Resident? *</label>
                <div className="wizard-toggle">
                  <button type="button" className={form.usCitizen ? 'active' : ''} onClick={() => update('usCitizen', true)}>Yes</button>
                  <button type="button" className={!form.usCitizen ? 'active' : ''} onClick={() => update('usCitizen', false)}>No</button>
                </div>
              </div>
              <div className="wizard-toggle-row">
                <label>Authorized to work in US? *</label>
                <div className="wizard-toggle">
                  <button type="button" className={form.authorizedToWork ? 'active' : ''} onClick={() => update('authorizedToWork', true)}>Yes</button>
                  <button type="button" className={!form.authorizedToWork ? 'active' : ''} onClick={() => update('authorizedToWork', false)}>No</button>
                </div>
              </div>
              <div className="wizard-toggle-row">
                <label>Has a disability?</label>
                <div className="wizard-toggle">
                  <button type="button" className={form.hasDisability ? 'active' : ''} onClick={() => update('hasDisability', true)}>Yes</button>
                  <button type="button" className={!form.hasDisability ? 'active' : ''} onClick={() => update('hasDisability', false)}>No</button>
                </div>
              </div>
            </div>
            <div className="wizard-field">
              <label>Ethnicity</label>
              <select value={form.ethnicity} onChange={(e) => update('ethnicity', e.target.value)}>
                <option value="">Select…</option>
                {ETHNICITY.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="wizard-field wizard-field-full wizard-counselor-notes">
            <label>Counselor Notes</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} placeholder="Internal notes — not visible to the member" />
          </div>
          <div className="wizard-actions">
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Continue to Step 2
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Program Selection */}
      {step === 2 && (
        <section className="wizard-step wizard-step-2">
          <h2 className="wizard-section-title"><BookOpen size={22} className="wizard-icon" /> Program Selection</h2>
          <p className="wizard-desc">Select the program for this member.</p>
          <div className="wizard-program-grid">
            {programs.map((p) => (
              <div
                key={p.slug}
                onClick={() => update('programSlug', p.slug)}
                className={`wizard-program-card ${form.programSlug === p.slug ? 'selected' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}><ProgramIcon program={p} size={24} /></div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{p.title}</h3>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>{p.duration}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)' }}>{p.salary}</div>
              </div>
            ))}
          </div>
          <div className="wizard-field wizard-field-full">
            <label>Why this program? (optional, counselor note)</label>
            <textarea value={form.programNotes} onChange={(e) => update('programNotes', e.target.value)} rows={2} />
          </div>
          <div className="wizard-actions wizard-actions-between">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)} disabled={!canProceedStep2}>
              Continue to Step 3
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Partner Referral (optional) */}
      {step === 3 && (
        <section className="wizard-step wizard-step-partner">
          <h2 className="wizard-section-title">
            <Handshake size={22} className="wizard-icon" /> Partner referral
          </h2>
          <p className="wizard-desc">
            Optional. Assign an active partner organization for referral tracking and automated milestone emails to their contact.
          </p>
          <div className="wizard-field wizard-field-full">
            <label>Partner organization</label>
            <select value={form.partnerId} onChange={(e) => update('partnerId', e.target.value)}>
              <option value="">None</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="wizard-actions wizard-actions-between">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
              Continue to Step 4
            </button>
          </div>
        </section>
      )}

      {/* Step 4: Resume Upload */}
      {step === 4 && (
        <section className="wizard-step wizard-step-3">
          <h2 className="wizard-section-title"><FileText size={22} className="wizard-icon" /> Resume Upload + AI Enhancement</h2>
          <p className="wizard-desc">Optional. You can upload a resume later.</p>
          <div
            className={`counselor-resume-upload ${loading === 'parse' ? 'loading' : ''}`}
            onClick={() => document.getElementById('wizard-resume-input')?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragover');
              const file = e.dataTransfer.files?.[0];
              if (file && ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
                const input = document.getElementById('wizard-resume-input') as HTMLInputElement;
                if (input) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  input.files = dt.files;
                  input.dispatchEvent(new Event('change'));
                }
              }
            }}
          >
            <input id="wizard-resume-input" type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={!!loading} style={{ display: 'none' }} />
            {loading === 'parse' ? <span>Parsing…</span> : resumeFile ? <span>{resumeFile.name}</span> : <span>Drag and drop PDF, DOC, or DOCX here (max 5MB)<br />or click to browse</span>}
          </div>
          {!resumeFile && (
            <button type="button" className="wizard-skip-link" onClick={() => setStep(5)}>
              Skip — you can upload a resume later
            </button>
          )}
          {resumeText && (
            <>
              <div className="counselor-resume-preview">
                <div className="counselor-resume-card">
                  <h3>Original Resume</h3>
                  <pre>{resumeText.slice(0, 1500)}{resumeText.length > 1500 ? '…' : ''}</pre>
                  {resumeFile && <a href="#" onClick={(e) => { e.preventDefault(); }} className="btn btn-outline btn-sm">Download</a>}
                </div>
                <div className="counselor-resume-card">
                  <h3>AI-Enhanced Resume</h3>
                  {enhancedResume ? (
                    <>
                      <pre>{enhancedResume.slice(0, 1500)}{enhancedResume.length > 1500 ? '…' : ''}</pre>
                      <a href="#" onClick={(e) => { e.preventDefault(); }} className="btn btn-outline btn-sm">Download</a>
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={handleEnhance} disabled={!!loading || !form.programSlug}>
                      {loading === 'enhance' ? 'Generating…' : 'Generate Enhanced Resume'}
                    </button>
                  )}
                </div>
              </div>
              {improvementSummary.length > 0 && (
                <div className="wizard-improvement-summary">
                  <strong>Improvements applied:</strong>
                  <ul>
                    {improvementSummary.map((s, i) => <li key={i}>{s.replace(/^[•\-]\s*/, '')}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
          <div className="wizard-actions wizard-actions-between">
            <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>Back</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>
              Continue to Step 5
            </button>
          </div>
        </section>
      )}

      {/* Step 5: Review & Create */}
      {step === 5 && (
        <section className="wizard-step wizard-step-4">
          <h2 className="wizard-section-title"><CheckCircle size={22} className="wizard-icon" /> Review & Create</h2>
          <div className="wizard-summary-card">
            <p><strong>Personal:</strong> {form.firstName} {form.lastName}, {form.email}, {formatPhone(form.phone)}</p>
            <p><strong>WIOA:</strong> Citizen {form.usCitizen ? 'Yes' : 'No'}, Authorized {form.authorizedToWork ? 'Yes' : 'No'}, Disability {form.hasDisability ? 'Yes' : 'No'}, Ethnicity: {form.ethnicity || '—'}</p>
            <p><strong>Program:</strong> {programs.find((p) => p.slug === form.programSlug)?.title ?? form.programSlug}</p>
            <p>
              <strong>Partner referral:</strong>{' '}
              {form.partnerId ? partners.find((p) => p.id === form.partnerId)?.name ?? form.partnerId : 'None'}
            </p>
            <p><strong>Resume:</strong> {resumeFile ? 'Original uploaded' : 'Not uploaded'}{enhancedResume ? ' + Enhanced' : ''}</p>
            {form.notes && <p><strong>Counselor notes:</strong> {form.notes}</p>}
          </div>
          <div className="wizard-actions wizard-actions-between">
            <button type="button" className="btn btn-outline" onClick={() => setStep(4)}>Back</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!!loading}>
              {loading === 'create' ? 'Creating…' : 'Create Member Account'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
