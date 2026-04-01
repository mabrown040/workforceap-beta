'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { JobApplicationSource } from '@prisma/client';

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
    source: 'OTHER' as JobApplicationSource,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="presentation">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 id={titleId} className="text-xl font-bold text-gray-900">Add Application</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close add application dialog"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div id={errorId} role="alert" className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              ref={firstFieldRef}
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              aria-describedby={error ? errorId : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8c0f37] focus:border-transparent"
              placeholder="e.g., Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Company *
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8c0f37] focus:border-transparent"
              placeholder="e.g., Techvera"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Date Applied *
            </label>
            <input
              type="date"
              name="appliedAt"
              value={formData.appliedAt}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8c0f37] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Source *
            </label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8c0f37] focus:border-transparent"
            >
              <option value="INDEED">Indeed</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="DIRECT">Direct</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Interview Date
            </label>
            <input
              type="date"
              name="nextInterviewDate"
              value={formData.nextInterviewDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8c0f37] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8c0f37] focus:border-transparent"
              rows={3}
              placeholder="Any notes about this application..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#8c0f37] text-white font-medium rounded-lg hover:bg-[#6b0a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Application'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
