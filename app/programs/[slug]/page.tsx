import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProgramBySlug } from '@/lib/content/programs';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const { PROGRAMS } = await import('@/lib/content/programs');
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

function buildCertifications(programTitle: string, partner: string) {
  const partnerCert =
    partner && partner.toLowerCase() !== 'workforceap'
      ? `${partner} Certificate`
      : 'WorkforceAP Completion Certificate';

  return [partnerCert, `${programTitle} Career Readiness Badge`];
}

function buildAudience(programTitle: string, categoryLabel: string, skills: string[]) {
  return [
    `Career starters who want to break into ${categoryLabel.toLowerCase()} roles`,
    `Learners who want structured, job-ready training in ${programTitle}`,
    `People who enjoy practical skill-building like ${skills.slice(0, 2).join(' and ') || 'hands-on projects'}`,
    'Motivated applicants ready to complete a cohort and pursue entry-level opportunities',
  ];
}

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);

  if (!program) notFound();

  const certifications = buildCertifications(program.title, program.partner);
  const audience = buildAudience(program.title, program.categoryLabel, program.skills);

  return (
    <div style={{ backgroundColor: '#141313', minHeight: '100vh' }}>
      <main className="wa-mx-auto wa-max-w-6xl wa-px-4 wa-py-8 md:wa-px-8 md:wa-py-12">
        <nav className="wa-mb-8 wa-text-sm" aria-label="Breadcrumb">
          <ol className="wa-flex wa-items-center wa-gap-2" style={{ color: '#debfc2' }}>
            <li>
              <Link href="/" style={{ color: '#debfc2' }}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">→</li>
            <li>
              <Link href="/programs" style={{ color: '#debfc2' }}>
                Programs
              </Link>
            </li>
            <li aria-hidden="true">→</li>
            <li style={{ color: '#e6e1e1' }}>{program.title}</li>
          </ol>
        </nav>

        <section className="wa-rounded-2xl wa-border wa-p-6 md:wa-p-10" style={{ borderColor: '#3a2c2d', backgroundColor: '#1a1818' }}>
          <div className="wa-mb-5 wa-inline-flex wa-rounded-full wa-px-4 wa-py-2 wa-text-xs wa-font-semibold wa-tracking-wide" style={{ backgroundColor: '#ad2c4d', color: '#e6e1e1' }}>
            {program.categoryLabel.toUpperCase()} • {program.duration.toUpperCase()}
          </div>

          <h1 className="wa-text-3xl wa-font-bold md:wa-text-5xl" style={{ color: '#e6e1e1' }}>
            {program.title}
          </h1>

          <p className="wa-mt-4 wa-max-w-3xl wa-text-base md:wa-text-lg" style={{ color: '#debfc2' }}>
            Build in-demand skills, earn industry-recognized credentials, and launch your next career step through this guided training program.
          </p>

          <div className="wa-mt-6 wa-grid wa-grid-cols-1 wa-gap-3 sm:wa-grid-cols-2 wa-max-w-xl">
            <div className="wa-rounded-xl wa-border wa-p-4" style={{ borderColor: '#3a2c2d', backgroundColor: '#201d1d' }}>
              <p className="wa-text-xs wa-uppercase wa-tracking-wide" style={{ color: '#debfc2' }}>
                Duration
              </p>
              <p className="wa-mt-1 wa-text-lg wa-font-semibold" style={{ color: '#e6e1e1' }}>
                {program.duration}
              </p>
            </div>
            <div className="wa-rounded-xl wa-border wa-p-4" style={{ borderColor: '#3a2c2d', backgroundColor: '#201d1d' }}>
              <p className="wa-text-xs wa-uppercase wa-tracking-wide" style={{ color: '#debfc2' }}>
                Certifications
              </p>
              <p className="wa-mt-1 wa-text-lg wa-font-semibold" style={{ color: '#e6e1e1' }}>
                {certifications.length}
              </p>
            </div>
          </div>

          <div className="wa-mt-8 wa-flex wa-flex-wrap wa-gap-3">
            <Link
              href={`/apply?program=${program.slug}`}
              className="wa-inline-flex wa-items-center wa-justify-center wa-rounded-lg wa-px-6 wa-py-3 wa-font-semibold"
              style={{ backgroundColor: '#ad2c4d', color: '#e6e1e1' }}
            >
              Apply Free
            </Link>
            <a
              href="#curriculum"
              className="wa-inline-flex wa-items-center wa-justify-center wa-rounded-lg wa-border wa-px-6 wa-py-3 wa-font-semibold"
              style={{ borderColor: '#ad2c4d', color: '#e6e1e1' }}
            >
              View Curriculum
            </a>
          </div>
        </section>

        <section id="curriculum" className="wa-mt-10">
          <h2 className="wa-text-2xl wa-font-bold" style={{ color: '#e6e1e1' }}>
            What You&apos;ll Learn
          </h2>
          <div className="wa-mt-4 wa-grid wa-grid-cols-2 wa-gap-2 md:wa-grid-cols-3 lg:wa-grid-cols-4">
            {program.courses.map((course) => (
              <span
                key={course.slug}
                className="wa-rounded-full wa-border wa-px-4 wa-py-2 wa-text-sm"
                style={{ borderColor: '#3a2c2d', color: '#debfc2', backgroundColor: '#1a1818' }}
              >
                {course.name}
              </span>
            ))}
          </div>
        </section>

        <section className="wa-mt-10">
          <h2 className="wa-text-2xl wa-font-bold" style={{ color: '#e6e1e1' }}>
            Certifications Earned
          </h2>
          <div className="wa-mt-4 wa-flex wa-flex-wrap wa-gap-3">
            {certifications.map((cert) => (
              <div
                key={cert}
                className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-px-4 wa-py-2"
                style={{ borderColor: '#ad2c4d', color: '#e6e1e1', backgroundColor: '#22181b' }}
              >
                <span
                  className="wa-inline-block wa-h-2 wa-w-2 wa-rounded-full"
                  style={{ backgroundColor: '#ad2c4d' }}
                />
                {cert}
              </div>
            ))}
          </div>
        </section>

        <section className="wa-mt-10">
          <h2 className="wa-text-2xl wa-font-bold" style={{ color: '#e6e1e1' }}>
            Outcomes
          </h2>
          <div className="wa-mt-4 wa-grid wa-grid-cols-1 wa-gap-3 md:wa-grid-cols-3">
            <article className="wa-rounded-xl wa-border wa-p-5" style={{ borderColor: '#3a2c2d', backgroundColor: '#1a1818' }}>
              <p className="wa-text-sm" style={{ color: '#debfc2' }}>Avg Salary</p>
              <p className="wa-mt-2 wa-text-xl wa-font-semibold" style={{ color: '#e6e1e1' }}>{program.salary}</p>
            </article>
            <article className="wa-rounded-xl wa-border wa-p-5" style={{ borderColor: '#3a2c2d', backgroundColor: '#1a1818' }}>
              <p className="wa-text-sm" style={{ color: '#debfc2' }}>Time to Complete</p>
              <p className="wa-mt-2 wa-text-xl wa-font-semibold" style={{ color: '#e6e1e1' }}>{program.duration}</p>
            </article>
            <article className="wa-rounded-xl wa-border wa-p-5" style={{ borderColor: '#3a2c2d', backgroundColor: '#1a1818' }}>
              <p className="wa-text-sm" style={{ color: '#debfc2' }}>Placement Rate</p>
              <p className="wa-mt-2 wa-text-xl wa-font-semibold" style={{ color: '#e6e1e1' }}>85%+</p>
            </article>
          </div>
        </section>

        <section className="wa-mt-10">
          <h2 className="wa-text-2xl wa-font-bold" style={{ color: '#e6e1e1' }}>
            Who This Is For
          </h2>
          <ul className="wa-mt-4 wa-list-disc wa-space-y-2 wa-pl-6" style={{ color: '#debfc2' }}>
            {audience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="wa-mt-10">
          <h2 className="wa-text-2xl wa-font-bold" style={{ color: '#e6e1e1' }}>
            Program Schedule
          </h2>
          <div className="wa-mt-4 wa-rounded-xl wa-border wa-p-5" style={{ borderColor: '#3a2c2d', backgroundColor: '#1a1818', color: '#debfc2' }}>
            <p><span style={{ color: '#e6e1e1', fontWeight: 600 }}>Cohort cadence:</span> New cohorts launch monthly.</p>
            <p className="wa-mt-2"><span style={{ color: '#e6e1e1', fontWeight: 600 }}>Weekly commitment:</span> {program.duration.includes('hrs/week') ? program.duration.split(',')[1]?.trim() ?? '10 hrs/week' : '10 hrs/week'}.</p>
            <p className="wa-mt-2"><span style={{ color: '#e6e1e1', fontWeight: 600 }}>Format:</span> Guided online learning with support checkpoints and milestone reviews.</p>
          </div>
        </section>

        <section className="wa-mt-12 wa-rounded-2xl wa-p-8 md:wa-p-12 wa-text-center" style={{ backgroundColor: '#ad2c4d' }}>
          <h2 className="wa-text-3xl wa-font-bold" style={{ color: '#e6e1e1' }}>
            Ready to Start {program.title}?
          </h2>
          <p className="wa-mt-3 wa-text-base md:wa-text-lg" style={{ color: '#f2d9de' }}>
            Join the next cohort and move toward a new career path with no-cost training.
          </p>
          <Link
            href={`/apply?program=${program.slug}`}
            className="wa-mt-6 wa-inline-flex wa-items-center wa-justify-center wa-rounded-lg wa-bg-white wa-px-8 wa-py-4 wa-text-lg wa-font-semibold"
            style={{ color: '#ad2c4d' }}
          >
            Apply Free Now
          </Link>
        </section>
      </main>
    </div>
  );
}
