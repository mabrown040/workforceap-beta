import Link from 'next/link';

type ProgramCTAProps = {
  programSlug: string;
  programTitle: string;
};

export default function ProgramCTA({ programSlug, programTitle }: ProgramCTAProps) {
  return (
    <section className="program-cta-section">
      <div className="program-cta-card">
        <span className="program-cta-badge">100% Free for qualifying participants</span>
        <h3>Ready to apply for {programTitle}?</h3>
        <p>No-cost training. Industry certifications. Job placement support.</p>
        <div className="program-cta-buttons">
          <Link href={`/apply?program=${programSlug}`} className="btn btn-primary">
            Apply for This Program
          </Link>
          <Link href="/find-your-path" className="btn btn-outline">
            Find Your Path
          </Link>
        </div>
      </div>
    </section>
  );
}
