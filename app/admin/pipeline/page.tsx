import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import PipelineBoard, { type PipelineStudentPayload } from '@/components/admin/PipelineBoard';

function serializeStudent(
  s: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    enrolledProgram: string | null;
    enrolledAt: Date | null;
    assessmentCompleted: boolean;
    coursesCompleted: unknown;
    deletedAt: Date | null;
    createdAt: Date;
    placementRecord: {
      employerName: string;
      jobTitle: string;
      salaryOffered: number | null;
      placedAt: Date;
    } | null;
    userCertifications: { certName: string; earnedAt: Date }[];
    applications: { status: string; submittedAt: Date | null }[];
  },
): PipelineStudentPayload {
  return {
    id: s.id,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    enrolledProgram: s.enrolledProgram,
    enrolledAt: s.enrolledAt?.toISOString() ?? null,
    assessmentCompleted: s.assessmentCompleted,
    coursesCompleted: s.coursesCompleted,
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    placementRecord: s.placementRecord
      ? {
          employerName: s.placementRecord.employerName,
          jobTitle: s.placementRecord.jobTitle,
          salaryOffered: s.placementRecord.salaryOffered,
          placedAt: s.placementRecord.placedAt.toISOString(),
        }
      : null,
    userCertifications: s.userCertifications.map((c) => ({
      certName: c.certName,
      earnedAt: c.earnedAt.toISOString(),
    })),
    applications: s.applications.map((a) => ({
      status: a.status,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })),
  };
}

export default async function AdminPipelinePage() {
  const students = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      enrolledProgram: true,
      enrolledAt: true,
      assessmentCompleted: true,
      coursesCompleted: true,
      deletedAt: true,
      createdAt: true,
      placementRecord: {
        select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
      },
      userCertifications: {
        select: { certName: true, earnedAt: true },
      },
      applications: {
        select: { status: true, submittedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const payload = students.map(serializeStudent);

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Student Pipeline</h1>
        <Link
          href="/admin/placements/new"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-accent)',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Record Placement
        </Link>
      </div>

      <PipelineBoard students={payload} />
    </div>
  );
}
