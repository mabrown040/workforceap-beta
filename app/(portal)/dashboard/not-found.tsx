import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div className="wa-flex wa-flex-col wa-items-center wa-justify-center wa-min-h-[60vh] wa-px-6 wa-text-center">
      <div className="wa-mb-6">
        <span className="material-symbols-outlined wa-text-6xl wa-text-[var(--color-accent)] wa-opacity-20">
          explore_off
        </span>
      </div>
      <h1 className="wa-text-2xl wa-font-black wa-tracking-tight wa-mb-3">
        Page not found
      </h1>
      <p className="wa-text-[var(--color-on-surface-variant)] wa-max-w-md wa-mb-8 wa-leading-relaxed">
        The section you're looking for doesn't exist or has been moved. 
        Try heading back to your dashboard to find what you need.
      </p>
      <div className="wa-flex wa-flex-wrap wa-justify-center wa-gap-3">
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
        <Link href="/dashboard/messages" className="btn btn-outline">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
