'use client';

import { ChevronDown, Clock, Mail, Phone } from 'lucide-react';
import { useState } from 'react';

/**
 * Operational context for admins/counselors on the placement surveys dashboard.
 * Written for a busy counselor managing ~40 members in ~2 hours/week.
 */
export default function PlacementSurveysWhatsThis() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-gray-900"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>What&apos;s this?</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 text-gray-700 space-y-4 leading-relaxed">
          <p>
            <strong>Post-placement surveys</strong> ask members how their new job is going about{' '}
            <strong>30 days after placement</strong>. A daily background job sends each placed member a{' '}
            <strong>one-time secure link</strong> by email. Their answers give you real retention data and
            satisfaction scores for funders.
          </p>

          <div className="rounded-md bg-white border border-gray-200 p-3 space-y-2">
            <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide">Follow-up timing</p>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <p className="text-sm">
                <strong>0–7 days pending:</strong> Wait. New hires are busy.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <p className="text-sm">
                <strong>7–14 days pending:</strong> Send one reminder — portal message or email.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <p className="text-sm">
                <strong>14+ days pending:</strong> Call or text. Offer to complete it over the phone.
              </p>
            </div>
          </div>

          <p>
            Use <strong>Pending</strong> to see who still needs to respond.{' '}
            <strong>Testimonials</strong> counts members who agreed to share a quote — useful for grant reports and marketing.
          </p>

          <p className="text-gray-600 text-xs">
            Counselors: see also{' '}
            <code className="rounded bg-gray-200 px-1 py-0.5">docs/COUNSELOR-RUNBOOK.md</code> for the full weekly checklist.
          </p>
        </div>
      )}
    </div>
  );
}
