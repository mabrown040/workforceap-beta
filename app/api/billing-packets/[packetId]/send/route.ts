import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadPacketForViewer, resolveAssignedCounselorContact, serializeBillingPacket } from '@/lib/billing/packetAccess';
import { sendBillingPacketEmails } from '@/lib/billing/sendPacket';

/**
 * "Email to counselor and student" button. Admin only. Sends the J5 + J6 PDFs
 * to the member and to their assigned counselor (cc the admin), then records
 * the send on the packet. Re-sending is allowed; each send is counted.
 */
export const POST = withApiGuc(async (_request: Request, { params }: { params: Promise<{ packetId: string }> }) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { packetId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(packetId)) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const loaded = await loadPacketForViewer(packetId, user.id, { requireAdmin: true });
    if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    const { packet, member } = loaded.value;

    const [counselor, actor] = await Promise.all([
      resolveAssignedCounselorContact(member.id),
      prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }),
    ]);

    const result = await sendBillingPacketEmails({ packet, member, counselor, ccEmail: actor?.email ?? null });
    if (result.sentTo.length === 0) {
      return NextResponse.json({ error: result.errors[0] ?? 'Could not send the documents right now.' }, { status: 502 });
    }

    const updated = await prisma.trainingBillingPacket.update({
      where: { id: packet.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sendCount: { increment: 1 },
        sentTo: Array.from(new Set([...packet.sentTo, ...result.sentTo])),
      },
    });

    return NextResponse.json({
      ok: true,
      packet: serializeBillingPacket(updated),
      sentTo: result.sentTo,
      studentSent: result.studentSent,
      counselorSent: result.counselorSent,
      counselorMissing: !counselor,
      warnings: result.errors,
    });
  } catch (error) {
    console.error('[billing-packets send]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
