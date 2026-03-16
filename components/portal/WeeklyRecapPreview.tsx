'use client';

import Link from 'next/link';

type Props = {
  userId: string;
};

export default function WeeklyRecapPreview({ userId }: Props) {
  return (
    <div className="weekly-recap-preview">
      <h3>Weekly recap</h3>
      <p>Your personalized summary of the week and recommended next actions.</p>
      <Link href="/weekly-recap" className="btn btn-outline btn-sm">
        View this week&apos;s recap
      </Link>
    </div>
  );
}
