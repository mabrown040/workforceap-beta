'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

export default function LinkedInAboutForm() {
  const [role, setRole] = useState('');
  const [bullets, setBullets] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { copy, copied } = useCopyToClipboard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('linkedin-about', 'LinkedIn About Section Generator');

    try {
      const res = await fetch('/api/ai/linkedin-about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, bullets }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setOutput(data.output ?? '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) void copy(output);
  };

  return (
    <form onSubmit={handleSubmit} className="portal-ai-tool-form">
      <div className="form-group">
        <label htmlFor="role">Target role / job title</label>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Software Developer, Project Manager"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="bullets">3-5 bullet points about yourself</label>
        <textarea
          id="bullets"
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          placeholder={'• 5 years in IT support\n• Led migration to cloud\n• CompTIA A+ certified\n• Passionate about helping teams succeed'}
          rows={8}
          required
          disabled={loading}
        />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
            Generating About section…
          </>
        ) : (
          'Generate About section'
        )}
      </button>
      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>LinkedIn About section</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}
