import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { packetDocumentFilename, renderJ5InvoicePdf, renderJ6CoverLetterPdf, sanitizePdfText, type PacketDocumentInput } from './packetPdf';
import { getTrainingProviderIdentity } from './providerIdentity';

// 1x1 transparent PNG.
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function input(overrides: Partial<PacketDocumentInput> = {}): PacketDocumentInput {
  return {
    packetNumber: 'WAP-2026-0001',
    invoiceDate: '2026-09-04',
    dueDate: '2026-10-04',
    billToName: 'Workforce Solutions Capital Area',
    billToAttention: 'Accounts Payable',
    billToAddress: '123 Main St\nAustin, TX 78701',
    billToEmail: 'ap@example.org',
    referenceNumber: 'ITA-2026-1',
    lineItems: [
      { description: 'IT Support Foundations', hours: 10, amount: 1250 },
      { description: 'A class with a deliberately long name that must wrap onto a second line inside the invoice table without overlapping the amount column', hours: 12.5, amount: 1250 },
      { description: 'Certification exam voucher(s)', hours: null, amount: 300 },
    ],
    totalAmount: 2800,
    coverLetterBody: 'Please find enclosed the invoice.\n\n- IT Support Foundations (10 contact hours)\n- Another class\n\nThank you.',
    signerName: 'Michael A. Brown, PMP, ChE',
    signerTitle: 'Executive Director',
    signatureImage: null,
    signedAt: new Date('2026-09-04T01:00:00Z'),
    member: { fullName: 'Tarrance Hopkins', email: 'tarrance@example.com' },
    programTitle: 'IT Support and Entry-level Cybersecurity Certificate',
    provider: getTrainingProviderIdentity(),
    logoPng: null,
    ...overrides,
  };
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('J5 / J6 PDF renderers', () => {
  it('renders a one-page J5 and J6 with a typed signature', async () => {
    const j5 = await renderJ5InvoicePdf(input());
    const j6 = await renderJ6CoverLetterPdf(input());
    assert.equal(Buffer.from(j5.slice(0, 5)).toString(), '%PDF-');
    assert.equal(Buffer.from(j6.slice(0, 5)).toString(), '%PDF-');
    assert.equal(await pageCount(j5), 1);
    assert.equal(await pageCount(j6), 1);
  });

  it('embeds a drawn PNG signature', async () => {
    const j5 = await renderJ5InvoicePdf(input({ signatureImage: TINY_PNG }));
    assert.equal(await pageCount(j5), 1);
  });

  it('flows a long invoice and a long letter onto extra pages instead of running off the sheet', async () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ description: `Class ${i + 1}`, hours: 4, amount: 100 }));
    const j5 = await renderJ5InvoicePdf(input({ lineItems: many, totalAmount: 4500 }));
    assert.ok((await pageCount(j5)) >= 2);
    const longLetter = Array.from({ length: 30 }, () => 'A paragraph of cover letter text that repeats to force pagination in the renderer.').join('\n\n');
    const j6 = await renderJ6CoverLetterPdf(input({ coverLetterBody: longLetter }));
    assert.ok((await pageCount(j6)) >= 2);
  });

  it('survives characters the standard fonts cannot encode', async () => {
    const j6 = await renderJ6CoverLetterPdf(input({ member: { fullName: 'Zoë Ñuñez 🎓', email: 'z@example.com' }, coverLetterBody: 'Emoji 🎓 and CJK 漢字 get replaced, accents stay: café.' }));
    assert.equal(await pageCount(j6), 1);
    assert.equal(sanitizePdfText('café 🎓 漢'), 'café ? ?');
  });

  it('builds safe filenames', () => {
    assert.equal(packetDocumentFilename('j5', 'WAP-2026-0001', "Tarrance O'Hopkins"), 'J5-training-invoice-WAP-2026-0001-tarrance-o-hopkins.pdf');
    assert.equal(packetDocumentFilename('j6', 'WAP-2026-0001', '   '), 'J6-cover-letter-WAP-2026-0001-participant.pdf');
  });
});
