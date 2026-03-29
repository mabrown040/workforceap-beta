import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Footer from '@/components/Footer';
import StitchPage from '@/components/marketing/StitchPage';
import { PROGRAMS } from '@/lib/content/programs';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { OR: [{ published: true }, { scheduledAt: { lte: new Date() } }] },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug, published: true },
    });
    if (!post) return {};
    return buildPageMetadata({
      title: post.title,
      description: post.excerpt ?? post.title,
      path: `/blog/${post.slug}`,
      image: post.coverImage ?? undefined,
    });
  } catch {
    return {};
  }
}

const categoryProgramMap: Record<string, string[]> = {
  'Career Tips': ['project-management-professional-pmp', 'it-support-professional-certificate-google'],
  'Program Spotlights': ['cybersecurity-professional-certificate-google', 'aws-cloud-practitioner', 'comptia-a'],
  'Success Stories': ['data-analytics-professional-certificate-google', 'ai-engineering-professional-certificate-ibm'],
  'Industry Insights': ['comptia-security', 'google-project-management-certificate'],
  Healthcare: ['medical-coding-and-billing-specialist', 'certified-clinical-medical-assistant'],
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const now = new Date();

  let post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
    category: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    published: boolean;
    scheduledAt: Date | null;
  } | null = null;
  let related: { slug: string; title: string }[] = [];

  try {
    post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post || (!post.published && (!post.scheduledAt || post.scheduledAt > now))) {
      notFound();
    }
    related = await prisma.blogPost.findMany({
      where: {
        published: true,
        id: { not: post.id },
        category: post.category ?? undefined,
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true },
    });
  } catch {
    notFound();
  }

  const relevantProgramSlugs = categoryProgramMap[post.category ?? ''] ?? [];
  const relevantPrograms = PROGRAMS.filter((program) => relevantProgramSlugs.includes(program.slug)).slice(0, 3);

  return (
    <StitchPage>
      <section className="stitch-hero stitch-hero--center">
        <div className="stitch-hero__copy">
          <Link href="/blog" className="btn btn-outline">Back to stories</Link>
          {post.category ? <div className="stitch-badge wa-mt-6">{post.category}</div> : null}
          <h1 className="stitch-title wa-mt-6">{post.title}</h1>
          <div className="stitch-lead">
            {post.authorName ? <span>By {post.authorName}</span> : null}
            {post.publishedAt ? <span>{post.authorName ? ' · ' : ''}{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span> : null}
          </div>
        </div>
      </section>

      {post.coverImage ? (
        <section className="stitch-section">
          <div className="stitch-surface">
            <Image
              src={post.coverImage}
              alt={`Cover image for ${post.title}`}
              width={1600}
              height={900}
              className="wa-w-full wa-h-auto wa-rounded-[22px] wa-object-cover"
              priority
            />
          </div>
        </section>
      ) : null}

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <article className="blog-post-article stitch-surface">
            <div className="blog-post-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>
          </article>

          <aside className="wa-flex wa-flex-col wa-gap-4">
            {(relevantPrograms.length > 0 || related.length > 0) ? (
              <div className="stitch-card">
                <div className="stitch-kicker">Related Resources</div>
                {relevantPrograms.length > 0 ? (
                  <div className="stitch-panel-list wa-mt-4">
                    {relevantPrograms.map((program) => (
                      <Link key={program.slug} href={`/programs/${program.slug}`} className="stitch-quick-link">
                        <span>{program.title}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {related.length > 0 ? (
                  <div className="stitch-panel-list wa-mt-4">
                    {related.map((entry) => (
                      <Link key={entry.slug} href={`/blog/${entry.slug}`} className="stitch-quick-link">
                        <span>{entry.title}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="stitch-cta-band">
              <div className="stitch-kicker">Next Step</div>
              <h2>Ready to turn reading into action?</h2>
              <p>Training and certifications from Google, IBM, Microsoft, and more remain free for members.</p>
              <div className="stitch-actions">
                <Link href="/find-your-path" className="btn btn-primary">Find your path</Link>
                <Link href="/apply" className="btn btn-outline">Apply now</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
