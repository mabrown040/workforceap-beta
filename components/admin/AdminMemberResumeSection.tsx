'use client';

import { useState } from 'react';
import StaffMemberResumePanel from '@/components/counselor/StaffMemberResumePanel';
import AdminResumeUpload from './AdminResumeUpload';

export default function AdminMemberResumeSection({ memberId }: { memberId: string }) {
  const [key, setKey] = useState(0);
  return (
    <>
      <StaffMemberResumePanel key={key} memberId={memberId} />
      <AdminResumeUpload memberId={memberId} onUploaded={() => setKey((k) => k + 1)} />
    </>
  );
}
