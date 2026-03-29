'use client';

export default function MobileProfileSkillsResume({
  resumeOriginalPath,
}: {
  resumeOriginalPath: string | null;
}) {
  const hasResume = Boolean(resumeOriginalPath);

  return (
    <div style={{ margin: '0 1.5rem 1rem', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)', background: 'var(--surface-container-lowest)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--color-on-surface-variant)' }}>Resume</h3>
      </div>

      {hasResume ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-accent-dark)', fontSize: '24px' }}>description</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
              {resumeOriginalPath?.split('/').pop() ?? 'resume.pdf'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>Uploaded</p>
          </div>
          <button
            className="text-xs font-bold"
            style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', background: 'var(--surface-container-high)', color: 'var(--color-accent-dark)' }}
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 0', borderRadius: '0.75rem', border: '2px dashed var(--outline-variant)', background: 'var(--surface-container)', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.875rem' }}>upload_file</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>Upload Resume</p>
          <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>PDF or DOC · Max 5MB</p>
          <input type="file" accept=".pdf,.doc,.docx" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }} />
        </label>
      )}
    </div>
  );
}
