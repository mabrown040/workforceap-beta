import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

/** Resource detail is served from /dashboard/career-library/[id]. */
export default async function ResourceDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/career-library/${id}`);
}
