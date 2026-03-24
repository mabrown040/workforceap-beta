import Link from 'next/link';
import { getProgramBySlug } from '@/lib/content/programs';
import { buildApplyProgramBlockCopy } from '@/lib/apply/applyProgramPage';

export default function ApplyProgramIntro({ programSlug }: { programSlug: string }) {
  const program = getProgramBySlug(programSlug);
  if (!program) return null;

  const { bullets, salaryLine } = buildApplyProgramBlockCopy(program);

  return (
    <section className="apply-program-intro" aria-labelledby="apply-program-intro-heading">
      <h2 id="apply-program-intro-heading" className="apply-program-intro__title">
        You&apos;re applying for: {program.title}
      </h2>
      <p className="apply-program-intro__cert">
        Certifying partner: <strong>{program.partner}</strong>
      </p>
      <ul className="apply-program-intro__bullets">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="apply-program-intro__salary">
        <strong>Typical starting salary range:</strong> {salaryLine} (early-career, Austin-area framing — not a guarantee)
      </p>
      <p className="apply-program-intro__more">
        <Link href={`/programs/${program.slug}`}>Read the full program overview</Link> or{' '}
        <Link href="/programs">compare all programs</Link>.
      </p>
    </section>
  );
}
