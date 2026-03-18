'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  suggestedDate: string;
  reasoning: string;
};

export default function BlogAIClient({ postCount }: { postCount: number }) {
  const router = useRouter();
  const [ideas, setIdeas] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState<'suggest' | 'ideas-topics' | 'ideas-draft' | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fromIdeasTopics = async () => {
    if (!ideas.trim()) return;
    setLoading('ideas-topics');
    setError(null);
    setSuggestions(null);
    try {
      const res = await fetch('/api/admin/blog/ai/from-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideas: ideas.trim(), mode: 'topics' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const fromIdeasDraft = async () => {
    if (!ideas.trim()) return;
    setLoading('ideas-draft');
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/ai/from-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideas: ideas.trim(), mode: 'draft' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      router.push(`/admin/blog/${data.post.id}/edit`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const fetchSuggestions = async () => {
    setLoading('suggest');
    setError(null);
    setSuggestions(null);
    try {
      const res = await fetch('/api/admin/blog/ai/suggest-topics', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const draftFromSuggestion = async (s: Suggestion & { suggestedDate?: string }) => {
    setLoading(s.slug);
    setError(null);
    try {
      const res = await fetch('/api/admin/blog/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      router.push(`/admin/blog/${data.post.id}/edit`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid #eee',
          borderRadius: '8px',
          background: '#fafafa',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>From your ideas</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Paste ideas, topics, or angles. AI will suggest blog subjects or draft a full post.
        </p>
        <textarea
          value={ideas}
          onChange={(e) => setIdeas(e.target.value)}
          placeholder="e.g. Veterans transitioning to tech, CompTIA Security+ demand in Austin, success story from warehouse to IT support..."
          rows={4}
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fromIdeasTopics}
            disabled={!!loading || !ideas.trim()}
            style={{
              padding: '0.5rem 1rem',
              background: '#4a9b4f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: loading || !ideas.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading === 'ideas-topics' ? 'Thinking…' : 'Suggest 3 topics'}
          </button>
          <button
            type="button"
            onClick={fromIdeasDraft}
            disabled={!!loading || !ideas.trim()}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: loading || !ideas.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading === 'ideas-draft' ? 'Drafting…' : 'Draft post from ideas'}
          </button>
        </div>
      </section>

      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid #eee',
          borderRadius: '8px',
          background: '#fafafa',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Suggest topics (from content)</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          AI analyzes your {postCount} published posts and programs to suggest 3 new topics (no ideas input).
        </p>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={!!loading}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading === 'suggest' ? 'Thinking…' : 'Suggest 3 topics'}
        </button>
      </section>

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

      {suggestions && suggestions.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Suggested topics</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {suggestions.map((s) => (
              <div
                key={s.slug}
                style={{
                  padding: '1.25rem',
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  background: 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{s.title}</h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        background: '#eee',
                        borderRadius: '4px',
                        marginRight: '0.5rem',
                      }}
                    >
                      {s.category}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                      Suggested: {new Date(s.suggestedDate).toLocaleDateString('en-US')}
                    </span>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: '#555' }}>
                      {s.excerpt}
                    </p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#888' }}>
                      {s.reasoning}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => draftFromSuggestion(s)}
                    disabled={!!loading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#4a9b4f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {loading === s.slug ? 'Drafting…' : 'Draft this'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          border: '1px solid #eee',
          borderRadius: '8px',
          background: '#fafafa',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>AI review</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Use the &quot;Review with AI&quot; button on the blog post edit page to get feedback on
          grammar, tone, and SEO.
        </p>
      </section>
    </div>
  );
}
