'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function CreateSuccessToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const email = searchParams.get('email');

  useEffect(() => {
    if (searchParams.get('toast') === 'created' && email) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        router.replace(pathname, { scroll: false });
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, email, router, pathname]);

  if (!visible || !email) return null;

  return (
    <div className="counselor-toast counselor-toast-success" role="status">
      <CheckCircle size={20} className="counselor-toast-icon" />
      <span>Member created. Welcome email sent to {email}.</span>
    </div>
  );
}
