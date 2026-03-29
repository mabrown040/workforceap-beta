'use client';

export default function MobileProfileSkillsResume({
  resumeOriginalPath,
}: {
  resumeOriginalPath: string | null;
}) {
  const hasResume = Boolean(resumeOriginalPath);

  return (
    <div className="mx-6 mb-4 p-5 rounded-xl border" style={{ background: '#fcf9f8', borderColor: 'rgba(222,191,194,0.3)' }}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#584144' }}>Resume</h3>
      </div>

      {hasResume ? (
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined" style={{ color: '#8c0f37', fontSize: '24px' }}>description</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#1c1b1b' }}>
              {resumeOriginalPath?.split('/').pop() ?? 'resume.pdf'}
            </p>
            <p className="text-[10px]" style={{ color: '#584144' }}>Uploaded</p>
          </div>
          <button
            className="text-xs font-bold px-3 py-1.5 rounded-full active:scale-90 transition-all"
            style={{ background: '#fff1f2', color: '#8c0f37' }}
          >
            Replace
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer active:opacity-80"
          style={{ borderColor: '#debfc2', background: '#f6f3f2' }}>
          <span className="material-symbols-outlined text-3xl" style={{ color: '#ad2c4d' }}>upload_file</span>
          <p className="text-sm font-semibold" style={{ color: '#1c1b1b' }}>Upload Resume</p>
          <p className="text-[10px]" style={{ color: '#584144' }}>PDF or DOC · Max 5MB</p>
          <input type="file" accept=".pdf,.doc,.docx" className="sr-only" />
        </label>
      )}
    </div>
  );
}
