import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';

export default async function CourseraIntegrationPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  const params = await searchParams;
  const queryString = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .flatMap(([k, v]) => (Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]]))
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      ).toString()
    : '';
  if (!user) redirect('/login?redirectTo=/dashboard/training' + queryString.replace(/^\?/, '&'));
  redirect('/dashboard/training' + queryString);
}
