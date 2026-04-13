import { redirect } from 'next/navigation';

/** Canonical account settings live in the member workspace shell. */
export default function AccountRedirectPage() {
  redirect('/dashboard/account');
}
