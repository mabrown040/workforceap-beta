import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { listPrograms, type B4BProgram } from '@/lib/coursera/b4bClient';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/admin/coursera/b4b-programs
 *
 * Returns every Coursera B4B program known to our org via `listPrograms()`.
 * This is what an admin needs to see in order to populate the
 * `Program.courseraB4BProgramId` bridge — pasting the B4B `id` (or `slug`)
 * for each WorkforceAP program so `getOrgScopedProgramUrl` can resolve a
 * real org-scoped URL instead of falling back to the platform root.
 *
 * Auth: super_admin OR admin in the actor's org. (We do not pass org here
 * because B4B credentials are global to the WorkforceAP B4B account.)
 *
 * Response shape:
 *   {
 *     ok: true,
 *     count: number,
 *     programs: Array<{
 *       id: string,
 *       slug: string | null,
 *       name: string,
 *       url: string | null,        // org-scoped learner URL (the holy grail)
 *       contentCount: number | null,
 *     }>
 *   }
 *
 * On B4B credential failure: { ok: false, error: '...' } with status 502 so
 * the admin UI can render a clear error rather than retrying silently.
 */

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

type B4BProgramWithUrl = B4BProgram & { url?: string; contentCount?: number };

async function _GET(request: Request) {
  try {
    const actor = await getUser();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(actor.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ limit: url.searchParams.get('limit') ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid query' }, { status: 400 });
    }
  
    try {
      const page = await listPrograms({ excludeContent: true, limit: parsed.data.limit ?? 100 });
      const programs = (page.elements as B4BProgramWithUrl[]).map((p) => ({
        id: p.id ?? '',
        slug: p.slug ?? null,
        name: p.name ?? '',
        url: p.url?.trim() ? p.url.trim() : null,
        contentCount: typeof p.contentCount === 'number' ? p.contentCount : null,
      }));
      return NextResponse.json({
        ok: true,
        count: programs.length,
        programs,
      });
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/b4b-programs' });
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : 'B4B listPrograms failed',
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('/admin/coursera/b4b-programs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(_GET);
