import Link from 'next/link';
import { PROGRAMS } from '@/lib/content/programs';

const CATEGORY_SAMPLES: Record<string, string> = {
  'it-cyber': 'it-cyber',
  'ai-software': 'ai-software',
  'healthcare': 'healthcare',
  'manufacturing': 'manufacturing',
};

export default function BlogRelatedPrograms() {
  const samplePrograms = PROGRAMS.filter((p) =>
    Object.keys(CATEGORY_SAMPLES).includes(p.category)
  )
    .reduce<typeof PROGRAMS>((acc, p) => {
      if (!acc.some((x) => x.category === p.category)) {
        acc.push(p);
      }
      return acc;
    }, [])
    .slice(0, 4);

  if (samplePrograms.length === 0) return null;

  return (
    <div className="blog-related-programs">
      <h3>Explore Our Programs</h3>
      <p>No-cost training for qualifying Austin-area residents. Industry certifications from Google, IBM, Microsoft, and more.</p>
      <ul>
        {samplePrograms.map((p) => (
          <li key={p.slug}>
            <Link href={`/programs/${p.slug}`}>{p.title}</Link>
            <span className="blog-related-meta">{p.duration}</span>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/find-your-path" className="link-arrow">Find Your Path</Link>
        {' · '}
        <Link href="/apply" className="link-arrow">Apply Now</Link>
      </p>
    </div>
  );
}
