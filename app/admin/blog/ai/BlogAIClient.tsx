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
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState<'suggest' | string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const draftFromSuggestion = async (s: Suggestion) => {
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
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Suggest topics</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          AI analyzes your {postCount} published posts and programs to suggest 3 new topics.
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
