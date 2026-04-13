import { redirect } from 'next/navigation';

/** Canonical help lives in the member workspace shell. */
export default function HelpRedirectPage() {
  redirect('/dashboard/help');
}
