import { Program } from '@/lib/content/programs';

interface Props {
  program: Program;
}

export function ProgramSalaryChart({ program }: Props) {
  // Extract salary range from string like "Starting salary: $78K-$98K"
  const match = program.salary.match(/\$([\d.]+)K?-\$?([\d.]+)K?/);
  const min = match ? parseInt(match[1]) * 1000 : 78000;
  const max = match ? parseInt(match[2]) * 1000 : 98000;
  const mid = Math.round((min + max) / 2);

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-4xl font-bold text-slate-900">${(min / 1000).toFixed(0)}K</div>
        <div className="mt-2 text-sm text-slate-500">Entry-level starting salary</div>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center text-white">
        <div className="text-4xl font-bold">${(mid / 1000).toFixed(0)}K</div>
        <div className="mt-2 text-sm text-slate-300">Average after 2 years</div>
      </div>
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-4xl font-bold text-slate-900">${(max / 1000).toFixed(0)}K</div>
        <div className="mt-2 text-sm text-slate-500">Experienced range</div>
      </div>
    </div>
  );
}
