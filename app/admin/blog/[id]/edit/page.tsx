import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { isAIConfigured } from '@/lib/ai/groq';
import BlogPostEditor from '../../BlogPostEditor';
import PageHeader from '@/components/portal/PageHeader';

type Props = { params: Promise<{ id: string }> };

export default async function AdminBlogEditPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true, slug: true, title: true, excerpt: true, content: true,
      coverImage: true, authorName: true, category: true, published: true,
      scheduledAt: true,
    },
  });
  if (!post) notFound();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link
        href="/admin/blog"
        style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Blog
      </Link>
      <PageHeader title={`Edit: ${post.title}`} />
      <BlogPostEditor mode="edit" post={{ ...post, scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null }} aiEnabled={isAIConfigured()} />
    </div>
  );
}
