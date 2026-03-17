import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getMemberResources } from '@/lib/content/memberResources';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const resources = await getMemberResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let content = '';
  if (resource.file) {
    try {
      const filePath = join(process.cwd(), 'content', 'member-resources', resource.file);
      content = readFileSync(filePath, 'utf-8');
    } catch {
      content = `# ${resource.title}\n\n${resource.summary}\n\nContent not available.`;
    }
  } else {
    content = `# ${resource.title}\n\n${resource.summary}`;
  }

  const filename = `${resource.id.replace(/[^a-z0-9-]/gi, '-')}.txt`;
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
