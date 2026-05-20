'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { upsertSourceDailySpend } from '@/lib/admin/growthMetrics';
import { isPaidUtmSource, normalizeUtmSource } from '@/lib/marketing/paidTrafficSources';

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function saveSourceDailySpendAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/growth');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const source = normalizeUtmSource(String(formData.get('source') ?? ''));
  const dollarsRaw = String(formData.get('dollars') ?? '').trim();
  const under15 = formData.get('under15') === '1' ? '1' : '';

  if (!isPaidUtmSource(source)) {
    redirect(`/admin/growth?error=invalid_source${under15 ? '&under15=1' : ''}`);
  }

  const dollars = Number.parseFloat(dollarsRaw);
  if (!Number.isFinite(dollars) || dollars < 0) {
    redirect(`/admin/growth?error=invalid_amount&source=${encodeURIComponent(source)}${under15 ? '&under15=1' : ''}`);
  }

  const cents = Math.round(dollars * 100);
  const orgId = await getActorOrganizationId(user.id);

  await upsertSourceDailySpend({
    organizationId: orgId,
    source,
    date: startOfUtcDay(new Date()),
    cents,
  });

  revalidatePath('/admin/growth');
  redirect(`/admin/growth?saved=1&source=${encodeURIComponent(source)}${under15 ? '&under15=1' : ''}`);
}
