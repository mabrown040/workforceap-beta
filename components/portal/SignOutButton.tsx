'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/client';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="btn"
      style={{
        background: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.4)',
        padding: '0.5rem 1rem',
        fontSize: '.9rem',
      }}
    >
      Sign out
    </button>
  );
}
