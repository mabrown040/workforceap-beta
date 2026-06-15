import type { Program } from '@/lib/content/programs';
import { getProgramDisplayTitle, getProgramDisplayPartner } from '@/lib/content/programs';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';

interface Props {
  program: Program;
  url: string;
}

export default function JsonLdEducationalOccupationalProgram({ program, url }: Props) {
  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);
  const salaryRange = salaryRangeDisplay(program);

  // Parse salary range for structured data (e.g., "$78K–$98K" → 78000, 98000)
  const salaryMatch = salaryRange.match(/\$(\d+)K?\s*[–-]\s*\$(\d+)K?/);
  const salaryMin = salaryMatch ? parseInt(salaryMatch[1]) * (salaryMatch[1].endsWith('K') ? 1000 : 1) : undefined;
  const salaryMax = salaryMatch ? parseInt(salaryMatch[2]) * (salaryMatch[2].endsWith('K') ? 1000 : 1) : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalProgram',
    name: displayTitle,
    description: `${displayTitle} training and certification offered at no cost for qualifying members. ${program.duration}. Starting salary ${salaryRange}.`,
    url,
    provider: {
      '@type': 'Organization',
      name: displayPartner,
      url: 'https://www.workforceap.org',
    },
    educationalProgramMode: 'online',
    timeToComplete: program.duration,
    occupationalCredentialAwarded: program.title + ' Certificate',
    ...(salaryMin && salaryMax
      ? {
          salaryUponCompletion: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            minValue: salaryMin,
            maxValue: salaryMax,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      eligibleRegion: {
        '@type': 'Country',
        name: 'United States',
      },
    },
    programPrerequisites: program.courses.map((course) => ({
      '@type': 'Course',
      name: course.name,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
