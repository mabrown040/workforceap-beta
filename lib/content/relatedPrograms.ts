import { PROGRAMS, type Program } from '@/lib/content/programs';

function skillOverlap(a: Program, b: Program): number {
  const setB = new Set(b.skills.map((s) => s.toLowerCase()));
  let n = 0;
  for (const s of a.skills) {
    if (setB.has(s.toLowerCase())) n += 1;
  }
  return n;
}

/** Up to `max` other programs: same category first, then highest skill overlap. */
export function getRelatedPrograms(slug: string, max = 3): Program[] {
  const self = PROGRAMS.find((p) => p.slug === slug);
  if (!self) return [];

  const others = PROGRAMS.filter((p) => p.slug !== slug);
  const sameCat = others.filter((p) => p.category === self.category);
  const diffCat = others.filter((p) => p.category !== self.category);

  sameCat.sort((a, b) => skillOverlap(self, b) - skillOverlap(self, a));
  diffCat.sort((a, b) => skillOverlap(self, b) - skillOverlap(self, a));

  const out: Program[] = [];
  for (const p of sameCat) {
    if (out.length >= max) break;
    out.push(p);
  }
  for (const p of diffCat) {
    if (out.length >= max) break;
    out.push(p);
  }
  return out;
}
