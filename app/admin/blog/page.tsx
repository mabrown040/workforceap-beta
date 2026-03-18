import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import BlogPostActions from '@/components/admin/BlogPostActions';

export default async function AdminBlogPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      published: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Blog Posts</h1>
        <Link
          href="/admin/blog/new"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-accent)',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          New Post
        </Link>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.95rem',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Title</th>
            <th style={{ padding: '0.75rem' }}>Category</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
            <th style={{ padding: '0.75rem' }}>Date</th>
            <th style={{ padding: '0.75rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{post.title}</td>
              <td style={{ padding: '0.75rem' }}>{post.category ?? '—'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    background: post.published ? 'rgba(74, 155, 79, 0.15)' : '#f0f0f0',
                    color: post.published ? 'var(--color-accent)' : '#666',
                  }}
                >
                  {post.published ? 'Published' : 'Draft'}
                </span>
              </td>
              <td style={{ padding: '0.75rem', color: '#666' }}>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString()
                  : new Date(post.updatedAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '0.75rem' }}>
                <BlogPostActions
                  id={post.id}
                  slug={post.slug}
                  published={post.published}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {posts.length === 0 && (
        <p style={{ color: '#666', padding: '2rem' }}>No blog posts yet.</p>
      )}
    </div>
  );
}
