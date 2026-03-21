'use client';

import '@/css/main.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error — Workforce Advancement Project</title>
      </head>
      <body className="app-global-error-body">
        <div className="app-system-page app-system-page--global">
          <div className="app-system-page__inner">
            <a href="/" className="app-system-page__wordmark">
              Workforce Advancement Project
            </a>
            <p className="app-system-page__eyebrow">Something went wrong</p>
            <h1 className="app-system-page__title">We couldn&apos;t load the application</h1>
            <p className="app-system-page__text">
              Please try again. If the problem continues, email{' '}
              <a href="mailto:info@workforceap.org">info@workforceap.org</a>
              {error.digest ? (
                <>
                  {' '}
                  (reference: <span className="app-system-page__digest">{error.digest}</span>)
                </>
              ) : null}
              .
            </p>
            <div className="app-system-page__actions">
              <button type="button" onClick={() => reset()} className="btn btn-primary">
                Try again
              </button>
              <a href="/" className="btn btn-outline">
                Back to home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
