'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

/**
 * Success feedback for /admin/placements/new, which redirects here on save.
 * Mirrors app/admin/members/[id]/CreateSuccessToast.tsx's query-param →
 * role="status" toast pattern rather than a silent redirect.
 */
export default function PlacementRecordedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const member = searchParams?.get('member') ?? '';
  const employer = searchParams?.get('employer') ?? '';

  useEffect(() => {
    if (searchParams?.get('toast') === 'placed') {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        if (pathname) router.replace(pathname, { scroll: false });
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, pathname, router]);

  if (!visible) return null;

  return (
    <div className="counselor-toast counselor-toast-success" role="status">
      <CheckCircle size={20} className="counselor-toast-icon" />
      <span>
        Placement recorded{member ? ` for ${member}` : ''}
        {employer ? ` at ${employer}` : ''}.
      </span>
    </div>
  );
}
