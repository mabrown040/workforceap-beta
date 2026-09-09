import LabEvidenceReview from '@/components/portal/counselor/LabEvidenceReview';

export default async function LabEvidenceReviewPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return <LabEvidenceReview key={submissionId} submissionId={submissionId} />;
}
