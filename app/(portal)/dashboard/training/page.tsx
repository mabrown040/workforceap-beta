import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';

/**
 * Training home consolidated into /dashboard.
 * All training progress, next-course links, and counselor contact
 * now live on the unified Dashboard. This redirect preserves
 * query params (e.g., ?program=google-it-support) so multi-program
 * tab switches and external bookmarks continue to work.
 */
export default async function TrainingPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  const params = await searchParams;

  const search = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .flatMap(([k, v]) =>
            Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]]
          )
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      ).toString()
    : '';

  if (!user) {
    redirect('/login?redirectTo=/dashboard' + search.replace(/^\?/, '&'));
  }

  redirect('/dashboard' + search);
}
