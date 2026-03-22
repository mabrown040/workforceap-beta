'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { TOOL_METADATA_BY_SLUG, type ToolSlug } from '@/lib/ai/toolMeta';
import { formatToolOutput } from '@/lib/ai/formatToolOutput';

export function AIToolIntro({ expectation, inputs, outputUse }: { expectation: string; inputs: string; outputUse: string }) {
  return (
    <div className="ai-tool-intro">
      <div>
        <span className="ai-tool-intro-label">What this tool does</span>
        <p>{expectation}</p>
      </div>
      <div>
        <span className="ai-tool-intro-label">What you need</span>
        <p>{inputs}</p>
      </div>
      <div>
        <span className="ai-tool-intro-label">How to use the output</span>
        <p>{outputUse}</p>
      </div>
    </div>
  );
}

export function AIToolResult({
  title,
  output,
  toolType,
  nextSteps = [],
}: {
  title: string;
  output: string;
  toolType: string;
  nextSteps?: ToolSlug[];
}) {
  const { copy, copied } = useCopyToClipboard();
  const formatted = formatToolOutput(output, toolType);

  return (
    <div className="ai-result-panel">
      <div className="ai-result-panel-header">
        <div>
          <h3>{title}</h3>
          <p>Saved automatically so you can revisit it from history.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void copy(formatted)}>
          {copied ? 'Copied!' : 'Copy output'}
        </button>
      </div>
      <pre className="ai-result-panel-content">{formatted}</pre>
      <div className="ai-result-panel-footer">
        <p className="ai-result-saved">
          Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
        </p>
        {nextSteps.length > 0 && (
          <div className="ai-next-steps-inline">
            <span className="ai-next-steps-inline-label">Suggested next:</span>
            {nextSteps.map((slug) => {
              const tool = TOOL_METADATA_BY_SLUG[slug];
              return (
                <Link key={slug} href={tool.href} className="btn btn-outline btn-sm">
                  {tool.title}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIToolSubmitButton({ loading, idleLabel, loadingLabel }: { loading: boolean; idleLabel: string; loadingLabel: string }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
      {loading ? (
        <>
          <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
          {loadingLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}

export function ResumeTextInput({
  value,
  onChange,
  disabled,
  label = 'Your resume',
  placeholder = 'Paste your resume here...',
  rows = 12,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label?: string;
  placeholder?: string;
  rows?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ai/extract-resume-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.text) {
        onChange(data.text);
      } else {
        setUploadError(data.error ?? 'Could not extract text.');
      }
    } catch {
      setUploadError('Upload failed. Try pasting instead.');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="form-group">
      <label htmlFor="resume">{label}</label>
      <div className="resume-upload-row">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileUpload}
          disabled={extracting || disabled}
          className="resume-file-input"
        />
        <span className="resume-upload-status">{extracting ? 'Extracting text…' : 'Upload PDF, DOCX, DOC, or TXT'}</span>
      </div>
      <textarea
        id="resume"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required
        disabled={disabled}
      />
      {uploadError && <div className="form-error" role="alert">{uploadError}</div>}
    </div>
  );
}

export function AIToolPathway({ currentTool, nextSteps }: { currentTool: ToolSlug; nextSteps: ToolSlug[] }) {
  const current = TOOL_METADATA_BY_SLUG[currentTool];
  if (nextSteps.length === 0) return null;

  return (
    <div className="ai-tool-pathway">
      <p className="ai-tool-pathway-kicker">Recommended sequence</p>
      <h3>Keep moving after {current.title.toLowerCase()}.</h3>
      <p>This toolkit works best when each result feeds the next step instead of becoming a one-off draft.</p>
      <div className="ai-tool-pathway-links">
        {nextSteps.map((slug, index) => {
          const tool = TOOL_METADATA_BY_SLUG[slug];
          return (
            <Link key={slug} href={tool.href} className="btn btn-outline">
              {index + 1}. {tool.title}
            </Link>
          );
        })}
        <Link href="/dashboard/ai-tools/history" className="btn btn-primary">
          Review saved history
        </Link>
      </div>
    </div>
  );
}
