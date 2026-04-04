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
    originalExt?: string | null;
    enhancedExt?: string | null;
    originalPreviewable?: boolean;
    enhancedPreviewable?: boolean;
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
          originalExt: d.originalExt ?? null,
          enhancedExt: d.enhancedExt ?? null,
          originalPreviewable: d.originalPreviewable ?? false,
          enhancedPreviewable: d.enhancedPreviewable ?? false,
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
        originalExt: d.originalExt ?? null,
        enhancedExt: d.enhancedExt ?? null,
        originalPreviewable: d.originalPreviewable ?? false,
        enhancedPreviewable: d.enhancedPreviewable ?? false,
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
          originalExt: d.originalExt ?? null,
          enhancedExt: d.enhancedExt ?? null,
          originalPreviewable: d.originalPreviewable ?? false,
          enhancedPreviewable: d.enhancedPreviewable ?? false,
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

          {/* Inline PDF preview — frozen document view */}
          {resumeData?.originalUrl && resumeData.originalPreviewable && (
            <div
              style={{
                marginBottom: '1rem',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#f5f5f5',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>📄 Original Resume</span>
                <a
                  href={resumeData.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Open ↗
                </a>
              </div>
              <object
                data={resumeData.originalUrl}
                type="application/pdf"
                aria-label="Original resume preview"
                style={{ width: '100%', height: '600px', border: 'none', background: '#fff' }}
              >
                <iframe
                  src={resumeData.originalUrl}
                  title="Original resume preview"
                  style={{ width: '100%', height: '600px', border: 'none', background: '#fff' }}
                />
              </object>
            </div>
          )}

          {/* Non-PDF original — download link */}
          {hasOriginal && resumeData?.originalUrl && !resumeData.originalPreviewable && (
            <div className="counselor-resume-card" style={{ marginBottom: '1rem' }}>
              <h3>Original Resume</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                This file is a {resumeData.originalExt?.toUpperCase() ?? 'document'}, so it may not render inline in all browsers.
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                <a href={resumeData.originalUrl} target="_blank" rel="noopener noreferrer">
                  Open Original →
                </a>
              </p>
            </div>
          )}

          {/* Enhanced PDF preview */}
          {resumeData?.enhancedUrl && resumeData.enhancedPreviewable && (
            <div
              style={{
                marginBottom: '1rem',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#f5f5f5',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>✨ AI-Enhanced Resume</span>
                <a
                  href={resumeData.enhancedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Open ↗
                </a>
              </div>
              <object
                data={resumeData.enhancedUrl}
                type="application/pdf"
                aria-label="AI-enhanced resume preview"
                style={{ width: '100%', height: '600px', border: 'none', background: '#fff' }}
              >
                <iframe
                  src={resumeData.enhancedUrl}
                  title="AI-enhanced resume preview"
                  style={{ width: '100%', height: '600px', border: 'none', background: '#fff' }}
                />
              </object>
            </div>
          )}

          {/* Enhanced text fallback (non-PDF) */}
          {hasEnhanced && resumeData?.enhancedUrl && !resumeData.enhancedPreviewable && (
            <div className="counselor-resume-card" style={{ marginBottom: '1rem' }}>
              <h3>AI-Enhanced</h3>
              {resumeData?.enhancedText && (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', maxHeight: '400px', overflow: 'auto' }}>
                  {resumeData.enhancedText.slice(0, 3000)}{resumeData.enhancedText.length > 3000 ? '…' : ''}
                </pre>
              )}
              <a href={resumeData.enhancedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.9rem' }}>
                Download Enhanced →
              </a>
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
