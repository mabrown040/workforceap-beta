import { Program } from '@/lib/content/programs';

interface Props {
  program: Program;
}

export function ProgramNextCohort({ program }: Props) {
  // Calculate next Monday as cohort start
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  const formatted = nextMonday.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="absolute -bottom-4 left-4 right-4 rounded-xl bg-white p-4 shadow-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Next cohort starts</div>
          <div className="text-lg font-bold text-slate-900">{formatted}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">Spots remaining</div>
          <div className="text-lg font-bold text-green-600">12</div>
        </div>
      </div>
    </div>
  );
}
