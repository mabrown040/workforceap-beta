import { Program, getProgramDisplayTitle, getProgramDisplayPartner } from '@/lib/content/programs';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { ProgramCourseList } from './SingleProgramLanding/ProgramCourseList';
import { ProgramSkillsCloud } from './SingleProgramLanding/ProgramSkillsCloud';
import { ProgramSalaryChart } from './SingleProgramLanding/ProgramSalaryChart';
import { ProgramTestimonials } from './SingleProgramLanding/ProgramTestimonials';
import { ProgramFaqAccordion } from './SingleProgramLanding/ProgramFaqAccordion';
import { ProgramNextCohort } from './SingleProgramLanding/ProgramNextCohort';
import { ProgramTrustStrip } from './SingleProgramLanding/ProgramTrustStrip';
import { ProgramApplyCta } from './SingleProgramLanding/ProgramApplyCta';
import { ProgramShareCard } from './SingleProgramLanding/ProgramShareCard';

interface Props {
  program: Program;
}

/** A/B headline variants for paid-traffic testing. Control = displayTitle. */
const HEADLINE_VARIANTS: Record<string, string[]> = {
  'it-support-professional-certificate-ibm': [
    'Start Your IT Career — Free IBM Certificate',
    'Free IT Support Training + IBM Credential',
    'Get Job-Ready in IT (No Experience Needed)',
  ],
  'it-automation-with-python-google': [
    'Learn Python for IT — Free Google Certificate',
    'Free Python + IT Automation Training',
    'Switch to Tech with Google\'s Free Program',
  ],
  'cybersecurity-professional-certificate-google': [
    'Break Into Cybersecurity — Free Google Certificate',
    'Free Cybersecurity Training + Career Coaching',
    'Start a Cybersecurity Career (Zero Cost)',
  ],
  'data-analytics-professional-certificate-google': [
    'Free Data Analytics Training — Google Certificate',
    'Become a Data Analyst at No Cost',
    'Google Data Analytics: Free for Austin Residents',
  ],
};

function resolveHeadline(program: Program): { text: string; variant: string } {
  const variants = HEADLINE_VARIANTS[program.slug];
  if (!variants || variants.length === 0) {
    return { text: getProgramDisplayTitle(program), variant: 'control' };
  }
  // In a real experiment, read from cookie / query param / feature flag.
  // For now, deterministic assignment by day-of-month so Vary caching works.
  const dayOfMonth = new Date().getDate();
  const idx = dayOfMonth % variants.length;
  return { text: variants[idx], variant: `v${idx}` };
}

export async function SingleProgramLanding({ program }: Props) {
  const t = await getTranslations('programs');
  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);
  const canonicalUrl = `https://www.workforceap.org/programs/${program.slug}`;
  const headline = resolveHeadline(program);

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD for SEO: Course / EducationalOccupationalProgram */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'EducationalOccupationalProgram',
            name: displayTitle,
            description: `${displayTitle} — ${program.duration}. ${program.salary}.`,
            provider: {
              '@type': 'Organization',
              name: 'Workforce Advancement Project',
              url: 'https://www.workforceap.org',
            },
            educationalProgramMode: 'online',
            timeToComplete: program.duration,
            occupationalCredentialAwarded: `${displayPartner} Professional Certificate`,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'No cost for qualifying members through WIOA and workforce development funding.',
            },
            url: canonicalUrl,
            image: `https://www.workforceap.org/api/og/program?slug=${program.slug}`,
          }),
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(173,44,77,0.3),_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_rgba(43,123,185,0.2),_transparent_50%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                {t('enrollingNow')}
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {headline.text}
              </h1>
              {/* A/B variant marker for analytics — hidden, readable by GTM/segment */}
              <span data-ab-variant={headline.variant} data-ab-test="program-headline" className="hidden" aria-hidden="true" />

              <p className="text-lg text-slate-300 leading-relaxed max-w-xl">
                {t('heroDescription', {
                  partner: displayPartner,
                  duration: program.duration,
                })}
              </p>

              <div className="flex flex-wrap gap-4">
                <ProgramApplyCta programSlug={program.slug} />
                <ProgramShareCard program={program} />
              </div>

              <ProgramTrustStrip />
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-1 shadow-2xl">
                <div className="h-full w-full rounded-xl bg-slate-900 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="text-6xl">{program.icon}</div>
                    <div className="text-2xl font-bold">{displayPartner}</div>
                    <div className="text-sm text-slate-400">Professional Certificate</div>
                  </div>
                </div>
              </div>
              <ProgramNextCohort program={program} />
            </div>
          </div>
        </div>
      </section>

      {/* Salary & Outcomes */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">{t('outcomesTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('outcomesSubtitle')}</p>
          </div>
          <ProgramSalaryChart program={program} />
        </div>
      </section>

      {/* Skills You'll Learn */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">{t('skillsTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('skillsSubtitle')}</p>
          </div>
          <ProgramSkillsCloud skills={program.skills} />
        </div>
      </section>

      {/* Course Curriculum */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">{t('curriculumTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">
              {t('curriculumSubtitle', { count: program.courses.length })}
            </p>
          </div>
          <ProgramCourseList courses={program.courses} />
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">{t('testimonialsTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('testimonialsSubtitle')}</p>
          </div>
          <ProgramTestimonials programSlug={program.slug} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">{t('faqTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('faqSubtitle')}</p>
          </div>
          <ProgramFaqAccordion program={program} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{t('ctaTitle')}</h2>
          <p className="mt-4 text-lg text-slate-300">{t('ctaSubtitle', { program: displayTitle })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ProgramApplyCta programSlug={program.slug} size="lg" />
            <ProgramShareCard program={program} />
          </div>
          <p className="mt-6 text-sm text-slate-400">
            {t('ctaDisclaimer')}
          </p>
        </div>
      </section>
    </div>
  );
}
