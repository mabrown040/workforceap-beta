'use client';

export default function MobileProfileSkillsResume({
  resumeOriginalPath,
}: {
  resumeOriginalPath: string | null;
}) {
  const hasResume = Boolean(resumeOriginalPath);

  return (
    <div style={{ margin: '0 1.5rem 1rem', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)', background: '#fcf9f8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em]" style={{ color: '#584144' }}>Resume</h3>
      </div>

      {hasResume ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ color: '#8c0f37', fontSize: '24px' }}>description</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="wa-text-sm wa-font-semibold wa-truncate" style={{ color: '#1c1b1b' }}>
              {resumeOriginalPath?.split('/').pop() ?? 'resume.pdf'}
            </p>
            <p className="wa-text-[10px]" style={{ color: '#584144' }}>Uploaded</p>
          </div>
          <button
            className="wa-text-xs wa-font-bold"
            style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', background: '#fff1f2', color: '#8c0f37' }}
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 0', borderRadius: '0.75rem', border: '2px dashed #debfc2', background: '#f6f3f2', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#ad2c4d', fontSize: '1.875rem' }}>upload_file</span>
          <p className="wa-text-sm wa-font-semibold" style={{ color: '#1c1b1b' }}>Upload Resume</p>
          <p className="wa-text-[10px]" style={{ color: '#584144' }}>PDF or DOC · Max 5MB</p>
          <input type="file" accept=".pdf,.doc,.docx" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }} />
        </label>
      )}
    </div>
  );
}
