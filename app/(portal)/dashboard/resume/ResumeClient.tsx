"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';

const MarkdownPreview = dynamic(() => import('@/components/MarkdownPreview'), { ssr: false });
import { uploadMemberResumeFile } from "@/lib/portal/memberResumeUpload";
import { trackFunnelEvent } from "@/lib/analytics/events";

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
  layout?: "side-by-side";
};

export default function ResumeClient({
  completeness,
  witData,
  hasOriginal: initialHasOriginal,
  hasEnhanced: initialHasEnhanced,
  layout,
}: ResumeClientProps) {
  const recommendedProfileCompleteness = 50;
  const [resumeData, setResumeData] = useState<{
    originalUrl: string | null;
    enhancedUrl: string | null;
    enhancedText: string | null;
    hasOriginal: boolean;
    hasEnhanced: boolean;
    originalExt: string | null;
    enhancedExt: string | null;
    previewOriginalPath: string | null;
    previewEnhancedPath: string | null;
  } | null>(null);
  const [originalDocHtml, setOriginalDocHtml] = useState<string | null>(null);
  const [enhancedDocHtml, setEnhancedDocHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [dragover, setDragover] = useState(false);
  const [originalPdfFailed, setOriginalPdfFailed] = useState(false);
  const [enhancedPdfFailed, setEnhancedPdfFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackFunnelEvent("member_signup", "resume_page_viewed");
  }, []);

  useEffect(() => {
    fetch("/api/member/resume")
      .then((r) => r.json())
      .then((d) => {
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: d.enhancedText ?? null,
          hasOriginal: d.hasOriginal ?? false,
          hasEnhanced: d.hasEnhanced ?? false,
          originalExt: d.originalExt ?? null,
          enhancedExt: d.enhancedExt ?? null,
          previewOriginalPath: d.previewOriginalPath ?? null,
          previewEnhancedPath: d.previewEnhancedPath ?? null,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    const result = await uploadMemberResumeFile(file);
    if (!result.ok) {
      setUploadError(result.error);
      setUploading(false);
      return;
    }
    trackFunnelEvent("member_signup", "resume_uploaded");
    try {
      const refetch = await fetch("/api/member/resume");
      const d = await refetch.json();
      setResumeData({
        originalUrl: d.originalUrl ?? null,
        enhancedUrl: d.enhancedUrl ?? null,
        enhancedText: d.enhancedText ?? null,
        hasOriginal: d.hasOriginal ?? true,
        hasEnhanced: d.hasEnhanced ?? false,
        originalExt: d.originalExt ?? null,
        enhancedExt: d.enhancedExt ?? null,
        previewOriginalPath: d.previewOriginalPath ?? null,
        previewEnhancedPath: d.previewEnhancedPath ?? null,
      });
    } catch {
      setUploadError("Could not refresh resume status");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/member/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const generated = typeof data.resume === "string" ? data.resume : "";
        const refetch = await fetch("/api/member/resume");
        const d = await refetch.json();
        const textFromApi =
          typeof d.enhancedText === "string" && d.enhancedText.trim()
            ? d.enhancedText
            : generated || null;
        setResumeData({
          originalUrl: d.originalUrl ?? null,
          enhancedUrl: d.enhancedUrl ?? null,
          enhancedText: textFromApi,
          hasOriginal: d.hasOriginal ?? false,
          hasEnhanced: Boolean(d.hasEnhanced || textFromApi),
          originalExt: d.originalExt ?? null,
          enhancedExt: d.enhancedExt ?? null,
          previewOriginalPath: d.previewOriginalPath ?? null,
          previewEnhancedPath: d.previewEnhancedPath ?? null,
        });
      } else {
        setGenerateError(data.error ?? "Generation failed");
      }
    } catch {
      setGenerateError("Generation failed");
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
    e.target.value = "";
  };

  useEffect(() => {
    const ext = resumeData?.originalExt;
    if (!ext || !["doc", "docx"].includes(ext)) {
      setOriginalDocHtml(null);
      return;
    }
    let cancelled = false;
    fetch("/api/member/resume/docx-html?variant=original", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.html) setOriginalDocHtml(d.html as string);
      })
      .catch(() => {
        if (!cancelled) setOriginalDocHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeData?.originalExt, resumeData?.hasOriginal]);

  useEffect(() => {
    const ext = resumeData?.enhancedExt;
    if (!ext || !["doc", "docx"].includes(ext)) {
      setEnhancedDocHtml(null);
      return;
    }
    let cancelled = false;
    fetch("/api/member/resume/docx-html?variant=enhanced", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.html) setEnhancedDocHtml(d.html as string);
      })
      .catch(() => {
        if (!cancelled) setEnhancedDocHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeData?.enhancedExt, resumeData?.hasEnhanced]);

  if (loading && !resumeData) {
    return <p style={{ color: "var(--color-on-surface-variant)" }}>Loading…</p>;
  }

  const hasOriginal = resumeData?.hasOriginal ?? initialHasOriginal;
  const hasEnhanced = resumeData?.hasEnhanced ?? initialHasEnhanced;

  // ── Section elements ──────────────────────────────────────────────────────

  const uploadSection = (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2
        style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}
      >
        Upload Resume
      </h2>
      <div
        className={`counselor-resume-upload ${dragover ? "dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="resume-upload-input"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileInput}
          className="sr-only"
        />
        <label
          htmlFor="resume-upload-input"
          style={{
            cursor: "pointer",
            display: "block",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "var(--color-on-surface-variant)" }}>
            {uploading
              ? "Uploading…"
              : "Drag and drop your resume here, or click to choose a file"}
          </p>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "0.85rem",
              color: "var(--color-on-surface-variant)",
            }}
          >
            PDF, DOC, DOCX — max 5MB
          </p>
        </label>
      </div>
      {uploadError && (
        <p style={{ color: "#c00", marginTop: "0.5rem" }}>{uploadError}</p>
      )}
    </section>
  );

  const aiGeneratorSection = (
    <section id="resume-ai-generator" style={{ marginBottom: "1.5rem" }}>
      <h2
        style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}
      >
        Build from Profile
      </h2>
      <div style={{ marginBottom: "0.5rem" }}>
        <span>Profile completeness: {completeness}%</span>
        <div className="counselor-profile-bar">
          <div
            className="counselor-profile-bar-fill"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>
      {completeness < recommendedProfileCompleteness && (
        <p style={{ marginBottom: "0.75rem" }}>
          <Link
            href="/dashboard/profile"
            style={{ color: "var(--color-accent)", fontWeight: 600 }}
          >
            Complete My Profile
          </Link>{" "}
          for a stronger resume. You can still build one now.
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating
          ? "Building…"
          : hasEnhanced
            ? "Refresh from Profile"
            : "Build Resume"}
      </button>
      {generateError && (
        <p style={{ color: "#c00", marginTop: "0.5rem" }}>{generateError}</p>
      )}
    </section>
  );

  const resumePreviewSection =
    hasOriginal || hasEnhanced ? (
      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}
        >
          Resume Preview
        </h2>

        {/* Original resume */}
        {hasOriginal && (
          <div
            style={{
              marginBottom: "1.25rem",
              border: "1px solid var(--outline-variant)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.9rem",
                background: "var(--surface-container)",
                borderBottom: "1px solid var(--outline-variant)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>Original Resume</span>
              {resumeData?.originalUrl ? (
                <a
                  href={resumeData.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--color-accent)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Download ↗
                </a>
              ) : loading ? (
                <span
                  style={{
                    color: "var(--color-on-surface-variant)",
                    fontSize: "0.8rem",
                  }}
                >
                  Loading…
                </span>
              ) : (
                <span
                  style={{
                    color: "var(--color-on-surface-variant)",
                    fontSize: "0.8rem",
                  }}
                >
                  File unavailable —{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-accent)",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "inherit",
                    }}
                  >
                    re-upload
                  </button>
                </span>
              )}
            </div>
            {resumeData?.previewOriginalPath &&
              resumeData.originalExt === "pdf" && (
                originalPdfFailed ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--surface-container)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>picture_as_pdf</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>PDF preview isn't available in this browser.</p>
                    {resumeData.originalUrl && (
                      <a href={resumeData.originalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>Download to view ↗</a>
                    )}
                  </div>
                ) : (
                  <iframe
                    title="Original resume preview"
                    src={resumeData.previewOriginalPath}
                    onError={() => setOriginalPdfFailed(true)}
                    onLoad={(e) => {
                      try {
                        const doc = (e.target as HTMLIFrameElement).contentDocument;
                        if (!doc || doc.title === '404' || doc.body?.innerHTML === '') setOriginalPdfFailed(true);
                      } catch { /* cross-origin — assume ok */ }
                    }}
                    style={{
                      width: "100%",
                      minHeight: "480px",
                      border: "none",
                      display: "block",
                      background: "#525659",
                    }}
                  />
                )
              )}
            {["doc", "docx"].includes(resumeData?.originalExt ?? "") && (
              <div style={{ background: "var(--surface-container)" }}>
                {originalDocHtml ? (
                  <iframe
                    title="Original resume preview"
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:1rem;margin:0;line-height:1.45;color:#111;}.mammoth-doc img{max-width:100%;height:auto;}</style></head><body>${originalDocHtml}</body></html>`}
                    sandbox=""
                    style={{
                      width: "100%",
                      minHeight: "480px",
                      border: "none",
                      display: "block",
                    }}
                  />
                ) : (
                  <p
                    style={{
                      padding: "1rem",
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "var(--color-on-surface-variant)",
                    }}
                  >
                    Loading preview…
                  </p>
                )}
              </div>
            )}
            {resumeData?.originalExt &&
              !["pdf", "doc", "docx"].includes(resumeData.originalExt) &&
              resumeData?.originalUrl && (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    background: "var(--surface-container)",
                  }}
                >
                  <a
                    href={resumeData.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Open resume
                  </a>
                </div>
              )}
          </div>
        )}

        {/* Enhanced resume */}
        {hasEnhanced && (
          <div
            style={{
              marginBottom: "1.25rem",
              border: "1px solid var(--outline-variant)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.9rem",
                background: "var(--surface-container)",
                borderBottom: "1px solid var(--outline-variant)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>Updated Resume</span>
              {resumeData?.enhancedUrl ? (
                <a
                  href={resumeData.enhancedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--color-accent)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Download ↗
                </a>
              ) : null}
            </div>
            {resumeData?.previewEnhancedPath &&
              resumeData.enhancedExt === "pdf" && (
                enhancedPdfFailed ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--surface-container)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>picture_as_pdf</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>PDF preview isn't available in this browser.</p>
                    {resumeData.enhancedUrl && (
                      <a href={resumeData.enhancedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>Download to view ↗</a>
                    )}
                  </div>
                ) : (
                  <iframe
                    title="Enhanced resume preview"
                    src={resumeData.previewEnhancedPath}
                    onError={() => setEnhancedPdfFailed(true)}
                    onLoad={(e) => {
                      try {
                        const doc = (e.target as HTMLIFrameElement).contentDocument;
                        if (!doc || doc.title === '404' || doc.body?.innerHTML === '') setEnhancedPdfFailed(true);
                      } catch { /* cross-origin — assume ok */ }
                    }}
                    style={{
                      width: "100%",
                      minHeight: "480px",
                      border: "none",
                      display: "block",
                      background: "#525659",
                    }}
                  />
                )
              )}
            {["doc", "docx"].includes(resumeData?.enhancedExt ?? "") && (
              <div style={{ background: "var(--surface-container)" }}>
                {enhancedDocHtml ? (
                  <iframe
                    title="Enhanced resume preview"
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:1rem;margin:0;line-height:1.45;color:#111;}.mammoth-doc img{max-width:100%;height:auto;}</style></head><body>${enhancedDocHtml}</body></html>`}
                    sandbox=""
                    style={{
                      width: "100%",
                      minHeight: "480px",
                      border: "none",
                      display: "block",
                    }}
                  />
                ) : (
                  <p
                    style={{
                      padding: "1rem",
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "var(--color-on-surface-variant)",
                    }}
                  >
                    Loading preview…
                  </p>
                )}
              </div>
            )}
            {resumeData?.enhancedUrl &&
              resumeData.enhancedExt &&
              !["pdf", "doc", "docx"].includes(resumeData.enhancedExt) &&
              !resumeData.enhancedText && (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    background: "var(--surface-container)",
                  }}
                >
                  <a
                    href={resumeData.enhancedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Open enhanced resume
                  </a>
                </div>
              )}
            {resumeData?.enhancedText &&
              !["pdf", "doc", "docx"].includes(
                resumeData?.enhancedExt ?? "",
              ) && (
                <article
                  key={resumeData.enhancedText.slice(0, 120)}
                  className="markdown-body"
                  style={{
                    padding: "1.25rem",
                    background: "var(--color-surface)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.65,
                    maxHeight: "min(70vh, 720px)",
                    overflowY: "auto",
                    color: "var(--color-on-surface)",
                  }}
                >
                <MarkdownPreview>{resumeData.enhancedText}</MarkdownPreview>
                </article>
              )}
          </div>
        )}
      </section>
    ) : null;

  const aiToolsSection = (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
        Resume Tools
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {[
          {
            icon: "edit_document",
            title: "Resume Rewriter",
            desc: "Rewrite and polish your resume for a specific role.",
            href: "/dashboard/ai-tools/resume-studio?view=rewrite",
          },
          {
            icon: "track_changes",
            title: "Job Match Scorer",
            desc: "See how well your resume matches a job posting.",
            href: "/dashboard/ai-tools/job-match-scorer",
          },
          {
            icon: "query_stats",
            title: "Resume Analysis",
            desc: "See what is working well and what to strengthen before you apply.",
            href: "/dashboard/ai-tools/resume-studio?view=score",
          },
        ].map(({ icon, title, desc, href }) => (
          <div
            key={href}
            style={{
              background: "var(--surface-container)",
              borderRadius: "0.75rem",
              padding: "1rem 1.1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              border: "1px solid var(--outline-variant)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "1.5rem",
                color: "var(--color-accent)",
                fontVariationSettings: "'FILL' 1",
              }}
              aria-hidden="true"
            >
              {icon}
            </span>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              {title}
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--color-on-surface-variant)",
                flexGrow: 1,
              }}
            >
              {desc}
            </span>
            <Link
              href={href}
              style={{
                color: "var(--color-accent)",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
                marginTop: "0.25rem",
              }}
            >
              Open →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );

  const witDataEmpty = !witData.name && !witData.email && !witData.phone && !witData.recentEmployer && !witData.targetJob && !witData.skills;

  const witGuideSection = (
    <section className="counselor-wit-guide">
      <h2
        style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}
      >
        WorkInTexas Guide
      </h2>
      <p
        style={{
          marginBottom: "1rem",
          color: "var(--color-on-surface-variant)",
        }}
      >
        {witDataEmpty
          ? "Copy these from your profile. Use these steps when creating your WorkInTexas profile."
          : "Pre-filled with your data. Use these steps when creating your WorkInTexas profile."}
      </p>
      <ol>
        <li>
          <strong>Create account</strong> at workintexas.com
        </li>
        <li>
          <strong>Contact info</strong> → {witData.name}, {witData.email},{" "}
          {witData.phone}
        </li>
        <li>
          <strong>Work history</strong> → {witData.recentEmployer}
        </li>
        <li>
          <strong>Target job</strong> → {witData.targetJob}
        </li>
        <li>
          <strong>Upload resume</strong> → Download from above
        </li>
        <li>
          <strong>Skills</strong> → {witData.skills}
        </li>
      </ol>
      <a
        href="https://www.workintexas.com"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary"
        style={{ marginTop: "1rem" }}
      >
        Open WorkInTexas →
      </a>
    </section>
  );

  // ── Layouts ───────────────────────────────────────────────────────────────

  if (layout === "side-by-side") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* Left: controls */}
        <div>
          {uploadSection}
          {aiGeneratorSection}
          {aiToolsSection}
          {witGuideSection}
        </div>
        {/* Right: preview */}
        <div>
          {resumePreviewSection ?? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "420px",
                background: "var(--surface-container)",
                borderRadius: "0.875rem",
                border: "2px dashed var(--outline-variant)",
                color: "var(--color-on-surface-variant)",
                textAlign: "center",
                padding: "2.5rem",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "0.75rem",
                  opacity: 0.35,
                }}
                aria-hidden="true"
              >
                description
              </span>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.55 }}>
                Upload a resume or use <strong>Build from Profile</strong> to
                create one. Your preview will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {uploadSection}
      {aiGeneratorSection}
      {resumePreviewSection}
      {aiToolsSection}
      {witGuideSection}
    </div>
  );
}
