import { redirect } from 'next/navigation';

export default async function PartnerMembersPage() {
  redirect('/partner/referred-members');
}
