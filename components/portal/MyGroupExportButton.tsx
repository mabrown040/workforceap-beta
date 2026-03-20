'use client';

type Member = {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
  enrolledAt: Date | null;
  progressPct: number;
  stage: string;
  placementRecord?: { employerName: string; jobTitle: string; salaryOffered: number | null; placedAt: Date } | null;
};

export default function MyGroupExportButton({ members }: { members: Member[] }) {
  function exportCsv() {
    const headers = ['Name', 'Email', 'Program', 'Enrolled', 'Progress %', 'Status', 'Employer', 'Job Title', 'Placed'];
    const rows = members.map((m) => [
      m.fullName,
      m.email,
      m.enrolledProgram ?? '',
      m.enrolledAt ? new Date(m.enrolledAt).toLocaleDateString() : '',
      String(m.progressPct),
      m.stage,
      m.placementRecord?.employerName ?? '',
      m.placementRecord?.jobTitle ?? '',
      m.placementRecord?.placedAt ? new Date(m.placementRecord.placedAt).toLocaleDateString() : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-group-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={members.length === 0}>
      Export CSV
    </button>
  );
}
