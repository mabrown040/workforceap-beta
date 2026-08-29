'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function CreateSuccessToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const email = searchParams?.get('email') ?? '';
  const toast = searchParams?.get('toast') ?? '';
  const resumeError = searchParams?.get('resumeError') ?? '';
  const setupError = searchParams?.get('setupError') ?? '';
  const welcomeError = searchParams?.get('welcomeError') ?? '';
  const hasWarnings = toast === 'created-with-warnings';

  useEffect(() => {
    if ((toast === 'created' || hasWarnings) && email) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        if (pathname) router.replace(pathname, { scroll: false });
      }, hasWarnings ? 10000 : 5000);
      return () => clearTimeout(t);
    }
  }, [toast, hasWarnings, email, router, pathname]);

  if (!visible || !email) return null;

  return (
    <div className="counselor-toast counselor-toast-success" role={hasWarnings ? 'alert' : 'status'}>
      {hasWarnings
        ? <AlertTriangle size={20} className="counselor-toast-icon" />
        : <CheckCircle size={20} className="counselor-toast-icon" />}
      <span>
        Member created for {email}.
        {welcomeError ? <> {welcomeError}</> : <> Welcome email sent.</>}
        {resumeError ? <> Resume was not attached: {resumeError} Upload it from this existing member page; do not create the member again.</> : null}
        {setupError ? <> {setupError} Review the member&apos;s funding details here.</> : null}
      </span>
    </div>
  );
}
