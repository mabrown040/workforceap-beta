import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadPacketForViewer } from '@/lib/billing/packetAccess';
import { packetToDocumentInput } from '@/lib/billing/packetDocument';
import { loadLetterheadLogo, packetDocumentFilename, renderPacketDocument, type PacketDocKind } from '@/lib/billing/packetPdf';

/**
 * Render one packet document on demand: ?doc=j5 (invoice) or ?doc=j6 (cover
 * letter). Open to the org admin, the member's assigned counselor and the
 * member. Inline by default; ?download=1 forces a save dialog.
 */
export const GET = withApiGuc(async (request: Request, { params }: { params: Promise<{ packetId: string }> }) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { packetId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(packetId)) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const url = new URL(request.url);
    const docParam = url.searchParams.get('doc');
    const kind: PacketDocKind = docParam === 'j6' ? 'j6' : 'j5';
    const download = url.searchParams.get('download') === '1';

    const loaded = await loadPacketForViewer(packetId, user.id);
    if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

    const { packet, member } = loaded.value;
    const bytes = await renderPacketDocument(kind, packetToDocumentInput(packet, member, await loadLetterheadLogo()));
    const filename = packetDocumentFilename(kind, packet.packetNumber, member.fullName);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[billing-packets pdf]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
