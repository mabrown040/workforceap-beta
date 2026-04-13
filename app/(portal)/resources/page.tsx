import { redirect } from 'next/navigation';

/** Canonical career library lives under the dashboard workspace. */
export default function ResourcesRedirectPage() {
  redirect('/dashboard/career-library');
}
