import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function PartnerMemberDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/partner/referred-members/${id}`);
}
