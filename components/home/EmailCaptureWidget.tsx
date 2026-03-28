'use client';

import { useState } from 'react';

export default function EmailCaptureWidget() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // TODO: wire to actual email capture endpoint
      setSubmitted(true);
    }
  };

  return (
    <section className="wa-py-24 wa-px-8">
      <div className="wa-max-w-3xl wa-mx-auto wa-bg-gray-50 dark:wa-bg-[#201f1f] wa-p-12 wa-rounded-2xl wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.2)] wa-relative wa-overflow-hidden">
        <div className="wa-absolute wa-top-0 wa-right-0 wa-w-64 wa-h-64 wa-bg-[rgba(173,44,77,0.05)] wa-rounded-full wa-blur-[48px] wa--mr-32 wa--mt-32" />
        <div className="wa-relative wa-z-10 wa-text-center">
          <h2 className="wa-text-3xl wa-font-bold wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-mb-4">
            Not ready to apply?
          </h2>
          <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-max-w-md wa-mx-auto wa-mb-8">
            Get our monthly career guide for Austin&apos;s tech scene and success stories from your neighborhood.
          </p>
          {submitted ? (
            <p className="wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] wa-font-bold">✓ You&apos;re in! Check your inbox.</p>
          ) : (
            <form onSubmit={handleSubmit} className="wa-flex wa-flex-col sm:wa-flex-row wa-gap-4 wa-max-w-md wa-mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="wa-flex-1 wa-bg-white dark:wa-bg-[#2b2a2a] wa-border wa-border-gray-300 dark:wa-border-transparent wa-rounded-lg wa-px-4 wa-py-3 wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-outline-none focus:wa-ring-2 focus:wa-ring-[#ad2c4d]"
              />
              <button
                type="submit"
                className="wa-bg-[#ad2c4d] wa-text-white wa-px-6 wa-py-3 wa-rounded-lg wa-font-bold wa-whitespace-nowrap wa-border-none wa-cursor-pointer hover:wa-bg-[#8a2340] wa-transition-colors"
              >
                Stay in the loop
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
