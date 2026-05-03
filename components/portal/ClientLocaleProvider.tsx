'use client';

import { LocaleProvider } from '@/components/portal/LocaleContext';

export default function ClientLocaleProvider({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
