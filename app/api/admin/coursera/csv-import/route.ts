import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { parseCourseActivityCsv } from '@/lib/coursera/csvImport';
import { ingestCourseActivityRows } from '@/lib/coursera/csvImport.server';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const runtime = 'nodejs';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return user;
}

async function readCsvFromRequest(request: NextRequest): Promise<{ content: string; filename: string | null } | { error: string; status: number }> {
  const contentType = request.headers.get('content-type') || '';

  // Cheap pre-flight on Content-Length when present.
  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (declaredLength && declaredLength > MAX_BYTES) {
    return { error: 'CSV exceeds 5 MB limit', status: 413 };
  }

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const entry = form.get('csv') ?? form.get('file');
    if (!entry || typeof entry === 'string') {
      return { error: 'Expected a file upload in the "csv" form field', status: 400 };
    }
    const file = entry as File;
    if (file.size > MAX_BYTES) {
      return { error: 'CSV exceeds 5 MB limit', status: 413 };
    }
    const content = await file.text();
    return { content, filename: file.name || null };
  }

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return { error: 'CSV exceeds 5 MB limit', status: 413 };
    }
    return { content: new TextDecoder('utf-8').decode(buffer), filename: null };
  }

  return {
    error: 'Unsupported Content-Type. Send multipart/form-data with a "csv" file field, or raw text/csv.',
    status: 415,
  };
}

export async function POST(request: NextRequest) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const read = await readCsvFromRequest(request);
  if ('error' in read) {
    return NextResponse.json({ error: read.error }, { status: read.status });
  }

  let parsedRows;
  try {
    parsedRows = parseCourseActivityCsv(read.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse CSV';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsedRows.length === 0) {
    return NextResponse.json(
      {
        error: 'No valid rows found in CSV (expected at least one row with email + course id + program slug).',
      },
      { status: 400 }
    );
  }

  try {
    const result = await ingestCourseActivityRows(parsedRows, { source: 'csv_import' });
    return NextResponse.json({
      ok: true,
      filename: read.filename,
      parsed: parsedRows.length,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
