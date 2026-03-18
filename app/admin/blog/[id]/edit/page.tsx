import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import BlogPostEditor from '../../BlogPostEditor';

type Props = { params: Promise<{ id: string }> };

export default async function AdminBlogEditPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link
        href="/admin/blog"
        style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Blog
      </Link>
      <h1 style={{ marginBottom: '1.5rem' }}>Edit: {post.title}</h1>
      <BlogPostEditor mode="edit" post={post} />
    </div>
  );
}
