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
    <div className="wa-mb-6 wa-rounded-lg wa-border wa-border-gray-200 wa-bg-gray-50 wa-text-sm wa-text-gray-800">
      <button
        type="button"
        className="wa-flex wa-w-full wa-items-center wa-justify-between wa-gap-3 wa-px-4 wa-py-3 wa-text-left wa-font-semibold wa-text-gray-900"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>What&apos;s this?</span>
        <ChevronDown
          className={`wa-h-5 wa-w-5 wa-shrink-0 wa-transition-transform ${open ? 'wa-rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="wa-border-t wa-border-gray-200 wa-px-4 wa-pb-4 wa-pt-3 wa-text-gray-700 wa-space-y-4 wa-leading-relaxed">
          <p>
            <strong>Post-placement surveys</strong> ask members how their new job is going about{' '}
            <strong>30 days after placement</strong>. A daily background job sends each placed member a{' '}
            <strong>one-time secure link</strong> by email. Their answers give you real retention data and
            satisfaction scores for funders.
          </p>

          <div className="wa-rounded-md wa-bg-white wa-border wa-border-gray-200 wa-p-3 wa-space-y-2">
            <p className="wa-font-semibold wa-text-gray-900 wa-text-xs wa-uppercase wa-tracking-wide">Follow-up timing</p>
            <div className="wa-flex wa-items-start wa-gap-2">
              <Clock className="wa-h-4 wa-w-4 wa-text-gray-500 wa-mt-0.5 wa-shrink-0" aria-hidden />
              <p className="wa-text-sm">
                <strong>0–7 days pending:</strong> Wait. New hires are busy.
              </p>
            </div>
            <div className="wa-flex wa-items-start wa-gap-2">
              <Mail className="wa-h-4 wa-w-4 wa-text-gray-500 wa-mt-0.5 wa-shrink-0" aria-hidden />
              <p className="wa-text-sm">
                <strong>7–14 days pending:</strong> Send one reminder — portal message or email.
              </p>
            </div>
            <div className="wa-flex wa-items-start wa-gap-2">
              <Phone className="wa-h-4 wa-w-4 wa-text-gray-500 wa-mt-0.5 wa-shrink-0" aria-hidden />
              <p className="wa-text-sm">
                <strong>14+ days pending:</strong> Call or text. Offer to complete it over the phone.
              </p>
            </div>
          </div>

          <p>
            Use <strong>Pending</strong> to see who still needs to respond.{' '}
            <strong>Testimonials</strong> counts members who agreed to share a quote — useful for grant reports and marketing.
          </p>

          <p className="wa-text-gray-600 wa-text-xs">
            Counselors: see also{' '}
            <code className="wa-rounded wa-bg-gray-200 wa-px-1 wa-py-0.5">docs/COUNSELOR-RUNBOOK.md</code> for the full weekly checklist.
          </p>
        </div>
      )}
    </div>
  );
}
