'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/css/counselor.css';
import { uploadMemberResumeFile } from '@/lib/portal/memberResumeUpload';

type WitData = {
  name: string;
  email: string;
  phone: string;
  recentEmployer: string;
  targetJob: string;
  skills: string;
};

type ResumeClientProps = {
  completeness: number;
  witData: WitData;
  hasOriginal: boolean;
  hasEnhanced: boolean;
};

export default function ResumeClient({
  completeness,
  witData,
  hasOriginal: initialHasOriginal,
  hasEnhanced: initialHasEnhanced,
}: ResumeClientProps) {
  const recommendedProfileCompleteness = 50;
  const [resumeData, setResumeData] = useState<{
    originalUrl: string | null;
    enhancedUrl: string | null;
    enhancedText: string | null;
    hasOriginal: boolean;
    hasEnhanced: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [dragover, setDragover] = useState(false);

  useEffect(() => {
    fetch('/api/member/resume')
      .then((r) => r.json())
      .then((d) => {
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: d.enhancedText ?? null,
          hasOriginal: d.hasOriginal ?? false,
          hasEnhanced: d.hasEnhanced ?? false,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    const result = await uploadMemberResumeFile(file);
    if (!result.ok) {
      setUploadError(result.error);
      setUploading(false);
      return;
    }
    try {
      const refetch = await fetch('/api/member/resume');
      const d = await refetch.json();
      setResumeData({
        originalUrl: d.originalUrl ?? null,
        enhancedUrl: d.enhancedUrl ?? null,
        enhancedText: d.enhancedText ?? null,
        hasOriginal: d.hasOriginal ?? true,
        hasEnhanced: d.hasEnhanced ?? false,
      });
    } catch {
      setUploadError('Could not refresh resume status');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/member/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const refetch = await fetch('/api/member/resume');
        const d = await refetch.json();
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: d.enhancedText ?? data.resume ?? null,
          hasOriginal: d.hasOriginal ?? false,
          hasEnhanced: d.hasEnhanced ?? true,
        });
      } else {
        setGenerateError(data.error ?? 'Generation failed');
      }
    } catch {
      setGenerateError('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  if (loading && !resumeData) {
    return <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading…</p>;
  }

  const hasOriginal = resumeData?.hasOriginal ?? initialHasOriginal;
  const hasEnhanced = resumeData?.hasEnhanced ?? initialHasEnhanced;

  return (
    <div>
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Upload</h2>
        <div
          className={`counselor-resume-upload ${dragover ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('resume-file-input')?.click()}
        >
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>
            {uploading ? 'Uploading…' : 'Drag and drop your resume here, or click to browse'}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
            PDF, DOC, DOCX — max 5MB
          </p>
        </div>
        {uploadError && <p style={{ color: '#c00', marginTop: '0.5rem' }}>{uploadError}</p>}
      </section>

      <section id="resume-ai-generator" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>AI Generator</h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <span>Profile completeness: {completeness}%</span>
          <div className="counselor-profile-bar">
            <div className="counselor-profile-bar-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
        {completeness < recommendedProfileCompleteness && (
          <p style={{ marginBottom: '0.75rem' }}>
            <Link href="/dashboard/profile" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              Complete My Profile
            </Link>
            {' '}for a better resume. You can still generate now.
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating…' : 'Generate Resume'}
        </button>
        {generateError && <p style={{ color: '#c00', marginTop: '0.5rem' }}>{generateError}</p>}
      </section>

      {(hasOriginal || hasEnhanced) && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Your Resume</h2>

          {/* Original resume — PDF inline preview + download link */}
          {hasOriginal && (
            <div
              style={{
                marginBottom: '1.25rem',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.9rem',
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>📄 Original Resume</span>
                {resumeData?.originalUrl ? (
                  <a
                    href={resumeData.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Open / Download ↗
                  </a>
                ) : (
                  <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem' }}>Generating link…</span>
                )}
              </div>
              {resumeData?.originalUrl && (
                <div style={{ width: '100%', textAlign: 'center', padding: '1.5rem', background: 'var(--surface-container)', borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }}>description</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface)', marginBottom: '1rem' }}>Your resume is ready</p>
                  <a
                    href={resumeData.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>open_in_new</span>
                    Open Resume
                  </a>
                </div>
              )}
              {!resumeData?.originalUrl && (
                <div style={{ padding: '1rem', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                  Resume uploaded. Refresh to view inline preview.
                </div>
              )}
            </div>
          )}

          {/* Enhanced resume */}
          {hasEnhanced && (
            <div
              style={{
                marginBottom: '1.25rem',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.9rem',
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>✨ AI-Enhanced Resume</span>
                {resumeData?.enhancedUrl && (
                  <a
                    href={resumeData.enhancedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Open / Download ↗
                  </a>
                )}
              </div>
              {resumeData?.enhancedUrl && (
                <div style={{ width: '100%', textAlign: 'center', padding: '1.5rem', background: 'var(--surface-container)', borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }}>auto_awesome</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface)', marginBottom: '1rem' }}>AI-enhanced resume ready</p>
                  <a
                    href={resumeData.enhancedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>open_in_new</span>
                    Open Enhanced Resume
                  </a>
                </div>
              )}
              {resumeData?.enhancedText && !resumeData?.enhancedUrl && (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', maxHeight: '400px', overflow: 'auto', padding: '1rem', margin: 0 }}>
                  {resumeData.enhancedText.slice(0, 3000)}{resumeData.enhancedText.length > 3000 ? '…' : ''}
                </pre>
              )}
            </div>
          )}
        </section>
      )}

      <section className="counselor-wit-guide">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>WorkInTexas Guide</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--color-on-surface-variant)' }}>
          Pre-filled with your data. Use these steps when creating your WorkInTexas profile.
        </p>
        <ol>
          <li><strong>Create account</strong> at workintexas.com</li>
          <li><strong>Contact info</strong> → {witData.name}, {witData.email}, {witData.phone}</li>
          <li><strong>Work history</strong> → {witData.recentEmployer}</li>
          <li><strong>Target job</strong> → {witData.targetJob}</li>
          <li><strong>Upload resume</strong> → Download from above</li>
          <li><strong>Skills</strong> → {witData.skills}</li>
        </ol>
        <a
          href="https://www.workintexas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          Open WorkInTexas →
        </a>
      </section>
    </div>
  );
}
