import type { Metadata } from 'next';
import { buildPageMetadata, SITE_URL } from '@/app/seo';
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
  const description = `Get ${program.title} training at no cost to members with ${cert} from WorkforceAP. Career certification in ${field}. Apply in 10 minutes.`;
  return { title, description };
}

export function buildApplyPageMetadata(programParam: string | undefined): Metadata {
  const slug = resolveApplyProgramSlug(programParam);
  const program = slug ? getProgramBySlug(slug) : undefined;

  if (!program) {
    return buildPageMetadata({
      title: 'Apply for Career Training',
      description:
        'Apply for career certification training at no cost to members. CompTIA, Google, IBM, AWS, and more. Serving communities nationwide. We follow up with next steps in 3 to 5 business days.',
      path: '/apply',
    });
  }

  const { title, description } = buildApplyProgramSeo(program);
  const base = buildPageMetadata({
    title,
    description,
    path: '/apply',
  });
  return {
    ...base,
    alternates: {
      ...base.alternates,
      canonical: `${SITE_URL}/apply?program=${encodeURIComponent(program.slug)}`,
    },
  };
}

export { getProgramBySlug };
