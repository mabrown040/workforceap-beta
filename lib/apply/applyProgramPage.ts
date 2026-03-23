import { getProgramBySlug, type Program } from '@/lib/content/programs';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';

export function resolveApplyProgramSlug(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== 'string' || !s.trim()) return undefined;
  return s.trim();
}

export function buildApplyProgramBlockCopy(program: Program): {
  bullets: string[];
  salaryLine: string;
} {
  const bullets = program.skills.slice(0, 3);
  const salaryLine = salaryRangeDisplay(program);
  return { bullets, salaryLine };
}

export { getProgramBySlug };
