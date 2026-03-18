'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProgramBySlug } from '@/lib/content/programs';

type RecentUser = {
  id: string;
  fullName: string | null;
  email: string;
  enrolledProgram: string | null;
  enrolledAt: Date | string | null;
  assessmentScorePct: number | null;
  assessmentCompleted: boolean | null;
};

type RecentSignupsTableProps = {
  users: RecentUser[];
};

export default function RecentSignupsTable({ users }: RecentSignupsTableProps) {
  const router = useRouter();

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Program</th>
            <th>Enrolled</th>
            <th>Score %</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              data-clickable
              onClick={() => router.push(`/admin/members/${u.id}`)}
            >
              <td>
                <Link href={`/admin/members/${u.id}`} onClick={(e) => e.stopPropagation()}>
                  {u.fullName}
                </Link>
              </td>
              <td>{u.email}</td>
              <td>
                {u.enrolledProgram ? getProgramBySlug(u.enrolledProgram)?.title ?? u.enrolledProgram : '—'}
              </td>
              <td>{u.enrolledAt ? new Date(u.enrolledAt).toLocaleDateString() : '—'}</td>
              <td>
                <span
                  className={
                    u.assessmentScorePct != null
                      ? u.assessmentScorePct >= 70
                        ? 'admin-score-high'
                        : u.assessmentScorePct >= 50
                          ? 'admin-score-mid'
                          : 'admin-score-low'
                      : ''
                  }
                >
                  {u.assessmentScorePct ?? '—'}%
                </span>
              </td>
              <td>{u.assessmentCompleted ? 'Assessment done' : 'Pending'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
