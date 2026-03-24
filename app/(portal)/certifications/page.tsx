import { redirect } from 'next/navigation';

/** Legacy URL — member certifications live under the dashboard shell. */
export default function CertificationsRedirectPage() {
  redirect('/dashboard/certifications');
}
