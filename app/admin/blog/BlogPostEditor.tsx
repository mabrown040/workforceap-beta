'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  authorName: string;
  category: string | null;
  published: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function BlogPostEditor({
  mode,
  post,
}: {
  mode: 'create' | 'edit';
  post?: BlogPost;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [authorName, setAuthorName] = useState(post?.authorName ?? 'WorkforceAP Team');
  const [category, setCategory] = useState(post?.category ?? '');
  const [published, setPublished] = useState(post?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{
    overallScore?: number;
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    seoSuggestions?: string[];
    toneNote?: string;
  } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (mode === 'create' && !slug) setSlug(slugify(v));
  };

  const handleReview = async () => {
    setReviewLoading(true);
    setReview(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, excerpt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setReview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: slug.trim(),
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim(),
        coverImage: coverImage.trim() || null,
        authorName: authorName.trim() || 'WorkforceAP Team',
        category: category.trim() || null,
        published: publish,
      };

      if (mode === 'create') {
        const res = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to create');
        router.push(`/admin/blog/${data.id}/edit`);
        router.refresh();
      } else {
        const res = await fetch(`/api/admin/blog/${post!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to update');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    maxWidth: '600px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '1rem',
  } as const;

  const labelStyle = { display: 'block', marginBottom: '0.25rem', fontWeight: 500 } as const;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave(published);
      }}
      style={{ maxWidth: '800px' }}
    >
      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: '6px',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
          style={inputStyle}
          placeholder="Post title"
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Slug (URL)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          style={inputStyle}
          placeholder="url-friendly-slug"
        />
        <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>
          Preview: /blog/{slug || 'your-slug'}
        </small>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
          placeholder="e.g. Career Tips, Success Stories"
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Excerpt</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Short summary for listing page"
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Cover Image URL</label>
        <input
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          style={inputStyle}
          placeholder="https://..."
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Author</label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          style={inputStyle}
          placeholder="WorkforceAP Team"
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Content (Markdown)</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            alignItems: 'stretch',
          }}
          className="live-editor-split"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={18}
            style={{
              ...inputStyle,
              maxWidth: '100%',
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              minHeight: '400px',
            }}
            placeholder="Write your post in Markdown. Use **bold**, ## headings, etc."
          />
          <div
            style={{
              border: '1px solid #ccc',
              borderRadius: '6px',
              padding: '1rem',
              background: '#fafafa',
              minHeight: '400px',
              overflow: 'auto',
            }}
            className="markdown-body"
          >
            <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <span style={{ color: '#999' }}>Live preview appears here…</span>
              )}
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .live-editor-split { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Published
        </label>
        <button
          type="button"
          onClick={handleReview}
          disabled={reviewLoading || !content.trim()}
          style={{
            padding: '0.4rem 0.9rem',
            background: '#f0f0f0',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontWeight: 500,
            cursor: reviewLoading || !content.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {reviewLoading ? 'Reviewing…' : 'Review with AI'}
        </button>
      </div>
      {review && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            background: '#fafafa',
          }}
        >
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
            AI review {review.overallScore != null && `— ${review.overallScore}/10`}
          </h4>
          {review.summary && <p style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>{review.summary}</p>}
          {review.strengths && review.strengths.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Strengths:</strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.9rem' }}>
                {review.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {review.improvements && review.improvements.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Improvements:</strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.9rem' }}>
                {review.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {review.seoSuggestions && review.seoSuggestions.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>SEO:</strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.9rem' }}>
                {review.seoSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {review.toneNote && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#666' }}>
              <strong>Tone:</strong> {review.toneNote}
            </p>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.5rem 1.25rem',
            background: '#f0f0f0',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        {mode === 'edit' && post && (
          <Link
            href={`/admin/blog/preview/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 1.25rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              alignSelf: 'center',
            }}
          >
            Preview →
          </Link>
        )}
      </div>
    </form>
  );
}
