'use client';

import { useState, FormEvent } from 'react';

export default function StitchEmailCapture() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    // TODO: wire up API call
    setSubmitted(true);
  }

  return (
    <section className="wa-py-16 wa-px-6">
      <div className="wa-mx-auto wa-max-w-xl wa-relative wa-overflow-hidden wa-rounded-2xl wa-border wa-border-m3d-outline-variant/20 wa-bg-m3d-surface-container wa-p-8">
        {/* Decorative blur circle */}
        <div className="wa-absolute wa--top-10 wa--right-10 wa-w-40 wa-h-40 wa-rounded-full wa-bg-m3d-primary-container/20 wa-blur-3xl wa-pointer-events-none" />

        <div className="wa-relative">
          {submitted ? (
            <p className="wa-text-center wa-text-lg wa-font-bold wa-text-m3d-primary">
              You&apos;re in! Check your inbox.
            </p>
          ) : (
            <>
              <h2 className="wa-text-xl wa-font-bold wa-text-m3d-on-surface">
                Not ready to apply?
              </h2>
              <p className="wa-mt-2 wa-text-sm wa-text-m3d-on-surface-variant wa-leading-relaxed">
                Get our monthly career guide with program updates, employer spotlights,
                and tips to level up your skills.
              </p>

              <form onSubmit={handleSubmit} className="wa-mt-6 wa-flex wa-flex-col sm:wa-flex-row wa-gap-3">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="wa-flex-1 wa-rounded-lg wa-border wa-border-m3d-outline-variant/30 wa-bg-m3d-surface-container-low wa-px-4 wa-py-2.5 wa-text-sm wa-text-m3d-on-surface wa-placeholder-m3d-outline wa-outline-none focus:wa-border-m3d-primary-container wa-transition-colors"
                />
                <button
                  type="submit"
                  className="wa-bg-m3d-primary-container wa-text-white wa-px-6 wa-py-2.5 wa-rounded-lg wa-font-bold wa-text-sm wa-transition-opacity hover:wa-opacity-90 wa-whitespace-nowrap"
                >
                  Stay in the loop
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
