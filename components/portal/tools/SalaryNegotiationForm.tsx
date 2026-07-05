'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, PhoneCall, Mail } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { FormField } from '@/components/portal/kit';
import ExportPdfButton from './ExportPdfButton';
import ToolFollowThrough from './ToolFollowThrough';

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 44,
  padding: '10px 22px',
  background: 'var(--wa-accent)',
  color: 'var(--wa-on-accent)',
  fontWeight: 700,
  fontSize: 13,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer'} as const;

const outlineButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 36,
  padding: '6px 14px',
  background: 'transparent',
  color: 'var(--wa-text)',
  fontWeight: 600,
  fontSize: 12,
  borderRadius: 999,
  border: '1px solid var(--wa-border)',
  cursor: 'pointer'} as const;

export default function SalaryNegotiationForm() {
  const [currentOffer, setCurrentOffer] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'phone' | 'email'>('phone');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { copy, copied } = useCopyToClipboard();

  useDraftAutosave('ai-tool:salary-negotiation:currentOffer', currentOffer, setCurrentOffer);
  useDraftAutosave('ai-tool:salary-negotiation:targetSalary', targetSalary, setTargetSalary);
  useDraftAutosave('ai-tool:salary-negotiation:jobTitle', jobTitle, setJobTitle);
  useDraftAutosave('ai-tool:salary-negotiation:companyName', companyName, setCompanyName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('salary-negotiation', 'Salary Negotiation Script');

    const offerNum = parseFloat(currentOffer.replace(/[^0-9.]/g, ''));
    const targetNum = parseFloat(targetSalary.replace(/[^0-9.]/g, ''));

    try {
      const res = await fetch('/api/ai/salary-negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentOffer: offerNum,
          targetSalary: targetNum,
          jobTitle,
          companyName,
          deliveryMethod})});

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setOutput(data.output ?? '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) void copy(output);
  };

  return (
    <form onSubmit={handleSubmit} className="wa-space-y-4">
      <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 wa-gap-4">
        <FormField
          label="Current offer amount ($)"
          id="offer"
          type="text"
          inputMode="numeric"
          value={currentOffer}
          onChange={(e) => setCurrentOffer(e.target.value)}
          placeholder="e.g. 75000"
          required
          disabled={loading}
        />
        <FormField
          label="Target salary ($)"
          id="target"
          type="text"
          inputMode="numeric"
          value={targetSalary}
          onChange={(e) => setTargetSalary(e.target.value)}
          placeholder="e.g. 85000"
          required
          disabled={loading}
        />
      </div>
      <FormField
        label="Job title"
        id="job-title"
        type="text"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        placeholder="e.g. Senior Software Engineer"
        required
        disabled={loading}
      />
      <FormField
        label="Company name"
        id="company"
        type="text"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="e.g. Acme Corp"
        required
        disabled={loading}
      />
      <FormField label="Delivery method" id="delivery">
        <select
          value={deliveryMethod}
          onChange={(e) => setDeliveryMethod(e.target.value as 'phone' | 'email')}
          disabled={loading}
          style={{
            marginTop: 4,
            width: '100%',
            fontSize: 14,
            border: '1px solid var(--wa-border)',
            borderRadius: 'var(--wa-radius-sm)',
            padding: '10px 12px',
            outline: 'none',
            background: 'var(--wa-surface)',
            color: 'var(--wa-text)'}}
        >
          <option value="phone">Phone call</option>
          <option value="email">Email</option>
        </select>
      </FormField>
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--wa-radius-sm)',
            background: 'var(--wa-danger-soft)',
            color: 'var(--wa-danger)',
            fontSize: 13,
            fontWeight: 600}}
        >
          {error}
        </div>
      )}
      <button type="submit" className="wa-kit-focus" style={primaryButtonStyle} disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={16} />
            Generating script…
          </>
        ) : (
          <>
            {deliveryMethod === 'phone' ? <PhoneCall size={15} aria-hidden /> : <Mail size={15} aria-hidden />}
            Generate script
          </>
        )}
      </button>
      {output && (
        <div className="wa-kit-card wa-kit-card--sm" style={{ marginTop: 8 }}>
          <div className="wa-flex wa-items-center wa-justify-between wa-flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--wa-text)' }}>
              {deliveryMethod === 'phone' ? 'Phone script' : 'Email script'}
            </h3>
            <div className="wa-flex wa-items-center" style={{ gap: 8 }}>
              <button type="button" className="wa-kit-focus" style={outlineButtonStyle} onClick={handleCopy}>
                <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
              <ExportPdfButton text={output} title="Salary Negotiation Script" toolName="Salary Negotiation" />
            </div>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.6,
              margin: 0,
              maxHeight: 400,
              overflowY: 'auto',
              color: 'var(--wa-text)'}}
          >
            {output}
          </pre>
          <ToolFollowThrough toolType="salary_negotiation" />
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--wa-muted)' }}>
            Saved to your history.{' '}
            <Link href="/dashboard/ai-tools/history" style={{ color: 'var(--wa-accent)', fontWeight: 700 }}>
              View all results
            </Link>
          </p>
        </div>
      )}
    </form>
  );
}
