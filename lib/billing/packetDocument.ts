import type { TrainingBillingPacket } from '@prisma/client';
import { getProgramBySlug } from '@/lib/content/programs';
import type { PacketDocumentInput } from './packetPdf';
import { getTrainingProviderIdentity } from './providerIdentity';
import { parseLineItems } from './packetSchema';

export function resolveProgramTitle(programSlug: string, catalogName?: string | null): string {
  return getProgramBySlug(programSlug)?.title ?? catalogName ?? programSlug;
}

/** Turn a stored packet row into the renderer input (shared by the PDF route and the emails). */
export function packetToDocumentInput(
  packet: TrainingBillingPacket,
  member: { fullName: string; email: string },
  logoPng: Uint8Array | null,
): PacketDocumentInput {
  return {
    packetNumber: packet.packetNumber,
    invoiceDate: packet.invoiceDate,
    dueDate: packet.dueDate,
    billToName: packet.billToName,
    billToAttention: packet.billToAttention,
    billToAddress: packet.billToAddress,
    billToEmail: packet.billToEmail,
    referenceNumber: packet.referenceNumber,
    lineItems: parseLineItems(packet.lineItems),
    totalAmount: packet.totalAmount,
    coverLetterBody: packet.coverLetterBody,
    signerName: packet.signerName,
    signerTitle: packet.signerTitle,
    signatureImage: packet.signatureImage,
    signedAt: packet.signedAt,
    member,
    programTitle: resolveProgramTitle(packet.programSlug),
    provider: getTrainingProviderIdentity(),
    logoPng,
  };
}
