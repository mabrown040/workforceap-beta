'use client';

export default function OnboardingDevReset({ portal }: { portal: 'member' | 'employer' | 'partner' }) {
  return (
    <div className="wa-fixed wa-bottom-4 wa-right-4 wa-z-[110]">
      <button
        type="button"
        onClick={async () => {
          await fetch('/api/onboarding/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portal }),
          });
          window.location.reload();
        }}
        className="wa-rounded-full wa-bg-slate-800 wa-px-3 wa-py-1.5 wa-text-xs wa-font-medium wa-text-white wa-shadow-lg wa-opacity-60 wa-transition-opacity hover:wa-bg-slate-700 hover:wa-opacity-100"
      >
        Reset onboarding
      </button>
    </div>
  );
}
