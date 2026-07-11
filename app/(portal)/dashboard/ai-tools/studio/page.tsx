import { redirect } from 'next/navigation';

/** Legacy Studio URL retained for bookmarks and existing deep links. */
export default async function LegacyVoiceStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; agent?: string }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (typeof params?.tab === 'string') next.set('tab', params.tab);
  if (typeof params?.agent === 'string') next.set('agent', params.agent);
  const query = next.toString();

  redirect(`/dashboard/ai-tools${query ? `?${query}` : ''}`);
}
