'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { JobApplicationSourceMembers } from '@/lib/jobApplications/constants';

interface JobApplicationFormProps {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function JobApplicationForm({ onSubmit, onClose }: JobApplicationFormProps) {
  const titleId = useId();
  const errorId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    role: '',
    company: '',
    appliedAt: new Date().toISOString().split('T')[0],
    source: JobApplicationSourceMembers.OTHER,
    notes: '',
    nextInterviewDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      const submitData = {
        ...formData,
        appliedAt: formData.appliedAt ? new Date(formData.appliedAt) : null,
        nextInterviewDate: formData.nextInterviewDate ? new Date(formData.nextInterviewDate) : null,
        status: 'APPLIED',
      };

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wa-fixed wa-inset-0 wa-bg-black wa-bg-opacity-50 wa-flex wa-items-center wa-justify-center wa-z-50 wa-p-4" role="presentation">
      <div
        className="wa-bg-white wa-rounded-lg wa-shadow-xl wa-max-w-md wa-w-full wa-max-h-[90vh] wa-overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="wa-sticky wa-top-0 wa-bg-white wa-border-b wa-p-6 wa-flex wa-justify-between wa-items-center">
          <h2 id={titleId} className="wa-text-xl wa-font-bold wa-text-gray-900">Add Application</h2>
          <button type="button"
            onClick={onClose}
            className="wa-text-gray-400 hover:wa-text-gray-600 wa-text-2xl wa-leading-none"
            aria-label="Close add application dialog"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="wa-p-6 wa-space-y-4">
          {error && (
            <div id={errorId} role="alert" className="wa-p-3 wa-bg-red-50 wa-border wa-border-red-200 wa-rounded wa-text-red-700 wa-text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="jobapplicationform-job-title-field" className="wa-block wa-text-sm wa-font-bold wa-text-gray-700 wa-mb-2">
              Job Title *
            </label>
            <input id="jobapplicationform-job-title-field"
              ref={firstFieldRef}
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              aria-describedby={error ? errorId : undefined}
              className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded-lg focus:wa-ring-2 focus:wa-ring-[#8c0f37] focus:border-transparent"
              placeholder="e.g., Software Engineer"
            />
          </div>

          <div>
            <label htmlFor="jobapplicationform-company-field" className="wa-block wa-text-sm wa-font-bold wa-text-gray-700 wa-mb-2">
              Company *
            </label>
            <input id="jobapplicationform-company-field"
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded-lg focus:wa-ring-2 focus:wa-ring-[#8c0f37] focus:border-transparent"
              placeholder="e.g., Techvera"
            />
          </div>

          <div>
            <label htmlFor="jobapplicationform-date-applied-field" className="wa-block wa-text-sm wa-font-bold wa-text-gray-700 wa-mb-2">
              Date Applied *
            </label>
            <input id="jobapplicationform-date-applied-field"
              type="date"
              name="appliedAt"
              value={formData.appliedAt}
              onChange={handleChange}
              required
              className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded-lg focus:wa-ring-2 focus:wa-ring-[#8c0f37] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="jobapplicationform-source-field" className="wa-block wa-text-sm wa-font-bold wa-text-gray-700 wa-mb-2">
              Source *
            </label>
            <select id="jobapplicationform-source-field"
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded-lg focus:wa-ring-2 focus:wa-ring-[#8c0f37] focus:border-transparent"
            >
              <option value="INDEED">Indeed</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="DIRECT">Direct</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="jobapplicationform-interview-date-field" className="wa-block wa-text-sm wa-font-bold wa-text-gray-700 wa-mb-2">
              Interview Date
            </label>
            <input id="jobapplicationform-interview-date-field"
              type="date"
              name="nextInterviewDate"
              value={formData.nextInterviewDate}
              onChange={handleChange}
              className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded-lg focus:wa-ring-2 focus:wa-ring-[#8c0f37] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="jobapplicationform-notes-field" className="wa-block wa-text-sm wa-font-bold wa-text-gray-700 wa-mb-2">
              Notes
            </label>
            <textarea id="jobapplicationform-notes-field"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="wa-w-full wa-px-3 wa-py-2 wa-border wa-border-gray-300 wa-rounded-lg focus:wa-ring-2 focus:wa-ring-[#8c0f37] focus:border-transparent"
              rows={3}
              placeholder="Any notes about this application..."
            />
          </div>

          {/* Buttons */}
          <div className="wa-flex wa-gap-3 wa-pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="wa-flex-1 wa-px-4 wa-py-2 wa-bg-[#8c0f37] wa-text-white wa-font-medium wa-rounded-lg hover:wa-bg-[#6b0a2a] disabled:wa-opacity-50 disabled:wa-cursor-not-allowed wa-transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Application'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="wa-flex-1 wa-px-4 wa-py-2 wa-bg-gray-200 wa-text-gray-700 wa-font-medium wa-rounded-lg hover:wa-bg-gray-300 wa-transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
