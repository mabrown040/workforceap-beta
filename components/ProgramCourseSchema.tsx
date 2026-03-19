import { SITE_URL } from '@/app/seo';
import type { Program } from '@/lib/content/programs';

type Props = { program: Program };

export default function ProgramCourseSchema({ program }: Props) {
  const salaryMatch = program.salary.match(/\$(\d+)K/);
  const salaryNum = salaryMatch ? parseInt(salaryMatch[1], 10) * 1000 : undefined;

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: program.title,
    description: `${program.title} — ${program.duration}. ${program.salary}. ${program.partner} certified. No-cost training for qualifying Austin-area residents.`,
    provider: {
      '@type': 'Organization',
      name: 'Workforce Advancement Project',
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/programs/${program.slug}`,
    },
    ...(salaryNum && {
      occupationalCredentialAwarded: {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'professional certification',
        name: `${program.partner} certification`,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
    />
  );
}
