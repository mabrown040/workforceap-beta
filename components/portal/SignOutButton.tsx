'use client';

import { useRouter } from 'next/navigation';

type SignOutButtonProps = {
  className?: string;
  children?: React.ReactNode;
  /** e.g. close mobile drawer before navigation */
  onSignOutStart?: () => void;
};

export function SignOutButton({ className, children, onSignOutStart }: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    onSignOutStart?.();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className ?? 'btn'}
      style={
        className
          ? undefined
          : {
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '0.5rem 1rem',
              fontSize: '.9rem',
            }
      }
    >
      {children ?? 'Sign out'}
    </button>
  );
}
