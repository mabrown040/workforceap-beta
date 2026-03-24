import { redirect } from 'next/navigation';

/** Legacy URL — member profile uses the dashboard workspace shell. */
export default function ProfileRedirectPage() {
  redirect('/dashboard/profile');
}
