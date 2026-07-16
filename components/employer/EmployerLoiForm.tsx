'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PROGRAMS } from '@/lib/content/programs';
import { getProgramDisplayTitle } from '@/lib/content/programs';

export default function EmployerLoiForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    hiringCommitment: '',
    preferredPrograms: [] as string[],
    message: '',
  });

  const handleProgramToggle = (slug: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredPrograms: prev.preferredPrograms.includes(slug)
        ? prev.preferredPrograms.filter((s) => s !== slug)
        : [...prev.preferredPrograms, slug],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/employer/loi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="wa-rounded-2xl wa-bg-white wa-p-8 wa-shadow-sm wa-border wa-border-slate-200 wa-text-center">
        <span className="material-symbols-outlined wa-text-rose-600 wa-mb-4 wa-block" style={{ fontSize: '3.5rem' }} aria-hidden>
          check_circle
        </span>
        <h2 className="wa-text-2xl wa-font-bold wa-text-slate-900 wa-mb-4">
          Letter of Intent Submitted!
        </h2>
        <p className="wa-text-slate-600 wa-mb-6">
          Thank you for your interest in partnering with WorkforceAP. Your employer
          account is free to use — our team will follow up soon to discuss hiring
          tools and partnership options.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="wa-space-y-8">
      {error && (
        <div className="wa-rounded-lg wa-bg-red-50 wa-border wa-border-red-200 wa-p-4 wa-text-red-700">
          {error}
        </div>
      )}

      <div className="wa-rounded-2xl wa-bg-white wa-p-8 wa-shadow-sm wa-border wa-border-slate-200 wa-space-y-6">
        <h2 className="wa-text-xl wa-font-bold wa-text-slate-900">Company Information</h2>
        
        <div className="wa-grid wa-gap-4 md:wa-grid-cols-2">
          <div className="wa-space-y-2">
            <label htmlFor="companyName" className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
              Company Name *
            </label>
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, companyName: e.target.value })}
              required
              className="wa-w-full wa-rounded-lg wa-border wa-border-slate-300 wa-px-3 wa-py-2 wa-text-sm focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-rose-500"
            />
          </div>
          <div className="wa-space-y-2">
            <label htmlFor="contactName" className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
              Contact Name *
            </label>
            <input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contactName: e.target.value })}
              required
              className="wa-w-full wa-rounded-lg wa-border wa-border-slate-300 wa-px-3 wa-py-2 wa-text-sm focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-rose-500"
            />
          </div>
        </div>

        <div className="wa-grid wa-gap-4 md:wa-grid-cols-2">
          <div className="wa-space-y-2">
            <label htmlFor="contactEmail" className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
              Contact Email *
            </label>
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contactEmail: e.target.value })}
              required
              className="wa-w-full wa-rounded-lg wa-border wa-border-slate-300 wa-px-3 wa-py-2 wa-text-sm focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-rose-500"
            />
          </div>
          <div className="wa-space-y-2">
            <label htmlFor="contactPhone" className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
              Contact Phone *
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contactPhone: e.target.value })}
              required
              className="wa-w-full wa-rounded-lg wa-border wa-border-slate-300 wa-px-3 wa-py-2 wa-text-sm focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-rose-500"
            />
          </div>
        </div>
      </div>

      <div className="wa-rounded-2xl wa-bg-white wa-p-8 wa-shadow-sm wa-border wa-border-slate-200 wa-space-y-6">
        <h2 className="wa-text-xl wa-font-bold wa-text-slate-900">Hiring Commitment</h2>
        
        <div className="wa-space-y-2">
          <label htmlFor="hiringCommitment" className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
            How many roles do you plan to fill per year? *
          </label>
          <select
            id="hiringCommitment"
            value={formData.hiringCommitment}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, hiringCommitment: e.target.value })}
            required
            className="wa-w-full wa-rounded-lg wa-border wa-border-slate-300 wa-px-3 wa-py-2 wa-text-sm focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-rose-500"
          >
            <option value="">Select commitment level</option>
            <option value="1-5">1-5 roles</option>
            <option value="6-10">6-10 roles</option>
            <option value="11-25">11-25 roles</option>
            <option value="25+">25+ roles</option>
          </select>
        </div>

        <div className="wa-space-y-3">
          <label className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
            Preferred Programs *
          </label>
          <p className="wa-text-sm wa-text-slate-500">Select the programs you&apos;re most interested in hiring from</p>
          <div className="wa-grid wa-gap-3 md:wa-grid-cols-2">
            {PROGRAMS.map((program) => (
              <div key={program.slug} className="wa-flex wa-items-start wa-gap-3">
                <input
                  type="checkbox"
                  id={program.slug}
                  checked={formData.preferredPrograms.includes(program.slug)}
                  onChange={() => handleProgramToggle(program.slug)}
                  className="wa-mt-1 wa-h-4 wa-w-4 wa-rounded wa-border-slate-300 wa-text-rose-600 focus:wa-ring-rose-500"
                />
                <label htmlFor={program.slug} className="wa-text-sm wa-text-slate-700 wa-cursor-pointer">
                  {getProgramDisplayTitle(program)}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wa-rounded-2xl wa-bg-white wa-p-8 wa-shadow-sm wa-border wa-border-slate-200 wa-space-y-6">
        <h2 className="wa-text-xl wa-font-bold wa-text-slate-900">Additional Information</h2>
        
        <div className="wa-space-y-2">
          <label htmlFor="message" className="wa-block wa-text-sm wa-font-medium wa-text-slate-700">
            Message (optional)
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Tell us about your hiring needs, timeline, or any questions..."
            rows={4}
            className="wa-w-full wa-rounded-lg wa-border wa-border-slate-300 wa-px-3 wa-py-2 wa-text-sm focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-rose-500"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="wa-w-full wa-bg-gradient-to-r wa-from-rose-600 wa-to-rose-700 hover:wa-from-rose-700 hover:wa-to-rose-800 wa-text-white wa-py-4 wa-text-lg wa-font-semibold"
      >
        {loading ? 'Submitting...' : 'Submit Letter of Intent'}
      </Button>
    </form>
  );
}
