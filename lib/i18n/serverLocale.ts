import { cookies } from 'next/headers';

export type WAPLocale = 'en' | 'es';

export const LOCALE_COOKIE = 'wap-locale';

const VALID: WAPLocale[] = ['en', 'es'];

export async function getLocale(): Promise<WAPLocale> {
  const cookieStore = await cookies();
  const val = cookieStore.get(LOCALE_COOKIE)?.value;
  return val && VALID.includes(val as WAPLocale) ? (val as WAPLocale) : 'en';
}
