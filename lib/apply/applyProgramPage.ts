import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
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

/** Field label for meta description (e.g. "cybersecurity and IT"). */
function programFieldLabel(program: Program): string {
  const map: Record<string, string> = {
    'it-cyber': 'cybersecurity and IT',
    'cloud-data': 'data and cloud',
    'ai-software': 'software and AI',
    business: 'business and digital skills',
    healthcare: 'healthcare technology',
    manufacturing: 'skilled trades and manufacturing',
    'digital-literacy': 'digital literacy',
  };
  return map[program.category] ?? 'career training';
}

export function buildApplyProgramSeo(program: Program): { title: string; description: string } {
  const cert = program.partner;
  const field = programFieldLabel(program);
  const title = `Apply for ${program.title} Training — WorkforceAP`;
  const description = `Get free ${program.title} training with ${cert} from WorkforceAP. No-cost career certification in ${field}. Apply in 10 minutes.`;
  return { title, description };
}

export function buildApplyPageMetadata(programParam: string | undefined): Metadata {
  const slug = resolveApplyProgramSlug(programParam);
  const program = slug ? getProgramBySlug(slug) : undefined;

  if (!program) {
    return buildPageMetadata({
      title: 'Apply for Free Career Training',
      description:
        'Apply for no-cost career certification training. CompTIA, Google, IBM, AWS, and more. Currently serving the Austin area with plans to expand. We respond within 24–48 hours.',
      path: '/apply',
    });
  }

  const { title, description } = buildApplyProgramSeo(program);
  return buildPageMetadata({
    title,
    description,
    path: '/apply',
  });
}

export { getProgramBySlug };
