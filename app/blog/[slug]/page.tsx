import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainNav from '@/components/MainNav';
import Footer from '@/components/Footer';
import { PROGRAMS } from '@/lib/content/programs';
import { ArrowRight, BookOpen, HelpCircle, GraduationCap, Calendar, User, Tag, ChevronLeft } from 'lucide-react';

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
    const path = `/blog/${post.slug}`;
    return buildPageMetadata({
      title: post.title,
      description: post.excerpt ?? post.title,
      path,
      image: post.coverImage ?? undefined,
    });
  } catch {
    return {};
  }
}

// Map blog categories to relevant programs
const categoryProgramMap: Record<string, string[]> = {
  'Career Tips': ['project-management-professional-pmp', 'it-support-professional-certificate-google'],
  'Program Spotlights': ['cybersecurity-professional-certificate-google', 'aws-cloud-practitioner', 'comptia-a'],
  'Success Stories': ['data-analytics-professional-certificate-google', 'ai-engineering-professional-certificate-ibm'],
  'Industry Insights': ['comptia-security', 'google-project-management-certificate'],
  'Healthcare': ['medical-coding-and-billing-specialist', 'certified-clinical-medical-assistant'],
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const now = new Date();
  
  let post: any = null;
  let related: any[] = [];
  
  try {
    post = await prisma.blogPost.findUnique({
      where: { slug },
    });
    
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

  // Get relevant programs based on category
  const relevantProgramSlugs = categoryProgramMap[post.category ?? ''] ?? [];
  const relevantPrograms = PROGRAMS.filter(p => relevantProgramSlugs.includes(p.slug)).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <MainNav />

      {/* Hero Section with Post Title */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Stories & Insights
          </Link>
          
          {post.category && (
            <span className="inline-block px-3 py-1 bg-[#ad2c4d]/20 text-[#ad2c4d] text-sm font-medium rounded-full mb-4">
              {post.category}
            </span>
          )}
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
            {post.authorName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.authorName}
              </div>
            )}
            {post.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cover Image */}
      {post.coverImage && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
              <Image
                src={post.coverImage}
                alt={`Cover image for ${post.title}`}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
      )}

      {/* Article Content */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </article>

          {/* Related Resources Section */}
          {(relevantPrograms.length > 0 || related.length > 0) && (
            <section className="mt-12 p-6 sm:p-8 bg-slate-800/50 border border-slate-700 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#ad2c4d]" />
                Related Resources
              </h3>
              
              {relevantPrograms.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Featured Programs
                  </h4>
                  <div className="flex flex-col gap-2">
                    {relevantPrograms.map(program => (
                      <Link 
                        key={program.slug}
                        href={`/programs/${program.slug}`}
                        className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                      >
                        <span className="flex items-center gap-2 text-white">
                          <GraduationCap className="w-5 h-5 text-[#ad2c4d]" />
                          {program.title}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {related.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Related Posts
                  </h4>
                  <div className="flex flex-col gap-2">
                    {related.map((r) => (
                      <Link 
                        key={r.slug}
                        href={`/blog/${r.slug}`}
                        className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                      >
                        <span className="text-white line-clamp-1">{r.title}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link 
                  href="/faq" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:border-slate-600 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-[#ad2c4d]" />
                  Read FAQ
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </Link>
                <Link 
                  href="/find-your-path" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#ad2c4d] hover:bg-[#8f2340] rounded-lg text-white transition-colors"
                >
                  Take Career Quiz
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="mt-12 p-8 bg-gradient-to-br from-[#ad2c4d]/20 to-slate-800/50 border border-[#ad2c4d]/30 rounded-2xl text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              Ready to start your career?
            </h3>
            <p className="text-slate-300 mb-6 max-w-lg mx-auto">
              Training and certifications from Google, IBM, Microsoft, and more — free for members.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link 
                href="/find-your-path" 
                className="px-6 py-3 bg-[#ad2c4d] hover:bg-[#8f2340] text-white font-medium rounded-lg transition-colors"
              >
                Find Your Path
              </Link>
              <Link 
                href="/apply" 
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
