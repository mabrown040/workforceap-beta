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
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
        <span className="material-symbols-outlined text-rose-600 mb-4 block" style={{ fontSize: '3.5rem' }} aria-hidden>
          celebration
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Letter of Intent Submitted!
        </h2>
        <p className="text-slate-600 mb-6">
          Thank you for your interest in partnering with WorkforceAP. Your employer
          account is free to use — our team will follow up soon to discuss hiring
          tools and partnership options.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Company Information</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
              Company Name *
            </label>
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, companyName: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="contactName" className="block text-sm font-medium text-slate-700">
              Contact Name *
            </label>
            <input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contactName: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700">
              Contact Email *
            </label>
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contactEmail: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-700">
              Contact Phone *
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contactPhone: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Hiring Commitment</h2>
        
        <div className="space-y-2">
          <label htmlFor="hiringCommitment" className="block text-sm font-medium text-slate-700">
            How many roles do you plan to fill per year? *
          </label>
          <select
            id="hiringCommitment"
            value={formData.hiringCommitment}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, hiringCommitment: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Select commitment level</option>
            <option value="1-5">1-5 roles</option>
            <option value="6-10">6-10 roles</option>
            <option value="11-25">11-25 roles</option>
            <option value="25+">25+ roles</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Preferred Programs *
          </label>
          <p className="text-sm text-slate-500">Select the programs you&apos;re most interested in hiring from</p>
          <div className="grid gap-3 md:grid-cols-2">
            {PROGRAMS.map((program) => (
              <div key={program.slug} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={program.slug}
                  checked={formData.preferredPrograms.includes(program.slug)}
                  onChange={() => handleProgramToggle(program.slug)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor={program.slug} className="text-sm text-slate-700 cursor-pointer">
                  {getProgramDisplayTitle(program)}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Additional Information</h2>
        
        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">
            Message (optional)
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Tell us about your hiring needs, timeline, or any questions..."
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white py-4 text-lg font-semibold"
      >
        {loading ? 'Submitting...' : 'Submit Letter of Intent'}
      </Button>
    </form>
  );
}
