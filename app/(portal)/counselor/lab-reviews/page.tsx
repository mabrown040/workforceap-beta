import LabReviewQueue from '@/components/portal/counselor/LabReviewQueue';
import { labReviewStatusSchema } from '@/lib/member/labWorkspaceTypes';

export default async function LabReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const parsed = labReviewStatusSchema.safeParse((await searchParams).status);
  const status = parsed.success ? parsed.data : 'submitted';
  return <LabReviewQueue key={status} status={status} />;
}
