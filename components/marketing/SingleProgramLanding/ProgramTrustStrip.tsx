import { Check } from 'lucide-react';

const ITEMS = ['WIOA Approved', 'Coursera Partner', 'Career Coaching Included', 'Employer Network'];

export function ProgramTrustStrip() {
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
      {ITEMS.map((label) => (
        <div key={label} className="flex items-center gap-2">
          <Check size={16} aria-hidden style={{ color: '#4a9b4f', flexShrink: 0 }} /> {label}
        </div>
      ))}
    </div>
  );
}
