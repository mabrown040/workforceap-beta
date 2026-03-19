import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import BlogPostActions from '@/components/admin/BlogPostActions';

function formatPostDate(d: Date) {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function goLiveDisplay(post: {
  published: boolean;
  publishedAt: Date | null;
  scheduledAt: Date | null;
}) {
  if (post.published) {
    if (post.publishedAt) return `Published ${formatPostDate(post.publishedAt)}`;
    return 'Immediate';
  }
  if (post.scheduledAt) return formatPostDate(post.scheduledAt);
  return 'Not scheduled';
}

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
      scheduledAt: true,
      updatedAt: true,
    },
  });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Blog Posts</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/admin/blog/ai"
            style={{
              padding: '0.5rem 1rem',
              background: '#f0f0f0',
              color: '#333',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              border: '1px solid #ccc',
            }}
          >
            AI Tools
          </Link>
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
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Go live</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const statusBadge =
              post.published ? (
                <span
                  className="admin-blog-badge admin-blog-badge--published"
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: '#d1fae5',
                    color: '#065f46',
                  }}
                >
                  Published
                </span>
              ) : post.scheduledAt ? (
                <span
                  className="admin-blog-badge admin-blog-badge--scheduled"
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: 'rgba(37, 99, 235, 0.12)',
                    color: '#1d4ed8',
                  }}
                >
                  Scheduled
                </span>
              ) : (
                <span
                  className="admin-blog-badge admin-blog-badge--draft"
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: 'var(--color-gray-100)',
                    color: 'var(--color-gray-700)',
                  }}
                >
                  Draft
                </span>
              );

            return (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.category ?? '—'}</td>
                <td>{statusBadge}</td>
                <td style={{ color: 'var(--color-gray-700)' }}>{goLiveDisplay(post)}</td>
                <td>
                  <BlogPostActions id={post.id} slug={post.slug} published={post.published} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {posts.length === 0 && (
        <div className="admin-empty-state">
          <h3>No blog posts yet</h3>
          <p>Create your first post to start publishing content.</p>
          <Link href="/admin/blog/new" className="btn btn-primary">
            New Post
          </Link>
        </div>
      )}
    </div>
  );
}
