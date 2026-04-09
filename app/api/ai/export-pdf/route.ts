import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getUser } from '@/lib/auth/server';

/**
 * POST /api/ai/export-pdf
 * Body: { text: string, title?: string, toolName?: string }
 * Returns: PDF with WorkforceAP logo header on each page.
 *
 * Embeds the actual /public/images/logo-tight.png in the header bar.
 * Falls back to vector text if the image can't be loaded.
 */

const ACCENT = rgb(173 / 255, 44 / 255, 77 / 255); // #ad2c4d
const DARK_TEXT = rgb(0.13, 0.13, 0.13);
const MUTED = rgb(0.52, 0.52, 0.52);
const RULE = rgb(0.87, 0.87, 0.87);

const HEADER_H = 56;
const FOOTER_H = 20;
const MARGIN = 50;
const PAGE_W = 612;
const PAGE_H = 792;

type EmbeddedLogo = Awaited<ReturnType<PDFDocument['embedPng']>> | null;

async function loadLogo(pdfDoc: PDFDocument): Promise<EmbeddedLogo> {
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'logo-tight.png');
    const logoBytes = await readFile(logoPath);
    return await pdfDoc.embedPng(logoBytes);
  } catch {
    return null;
  }
}

function drawHeader(
  page: ReturnType<PDFDocument['getPage']>,
  boldFont: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  lightFont: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  logo: EmbeddedLogo,
) {
  // Accent background bar
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: ACCENT });

  if (logo) {
    // Draw the actual WAP logo image — proportionally scaled to fit header
    const logoNative = logo.scale(1);
    const logoH = HEADER_H - 14; // leave vertical padding
    const logoW = (logoNative.width / logoNative.height) * logoH;
    page.drawImage(logo, {
      x: MARGIN - 4,
      y: PAGE_H - HEADER_H + (HEADER_H - logoH) / 2,
      width: logoW,
      height: logoH,
    });
    // workforceap.org right-aligned
    const urlText = 'workforceap.org';
    const urlW = lightFont.widthOfTextAtSize(urlText, 8);
    page.drawText(urlText, {
      x: PAGE_W - MARGIN - urlW + MARGIN - 4,
      y: PAGE_H - HEADER_H / 2 - 4,
      font: lightFont,
      size: 8,
      color: rgb(1, 0.88, 0.9),
    });
  } else {
    // Fallback: text-only header
    const cx = 26;
    const cy = PAGE_H - HEADER_H / 2;
    page.drawCircle({ x: cx, y: cy, size: 14, color: rgb(1, 1, 1) });
    page.drawLine({ start: { x: cx + 3, y: cy + 9 }, end: { x: cx - 2, y: cy + 1 }, thickness: 2.5, color: ACCENT });
    page.drawLine({ start: { x: cx - 2, y: cy + 1 }, end: { x: cx + 2, y: cy + 1 }, thickness: 2.5, color: ACCENT });
    page.drawLine({ start: { x: cx + 2, y: cy + 1 }, end: { x: cx - 3, y: cy - 9 }, thickness: 2.5, color: ACCENT });
    page.drawText('WorkforceAP', { x: 48, y: PAGE_H - HEADER_H / 2 + 5, font: boldFont, size: 13, color: rgb(1, 1, 1) });
    page.drawText('workforceap.org', { x: PAGE_W - MARGIN - lightFont.widthOfTextAtSize('workforceap.org', 8) + MARGIN - 4, y: PAGE_H - HEADER_H / 2 - 4, font: lightFont, size: 8, color: rgb(1, 0.88, 0.9) });
  }
}

function drawFooter(
  page: ReturnType<PDFDocument['getPage']>,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  pageNum: number,
  pageCount: number,
) {
  page.drawLine({ start: { x: MARGIN, y: FOOTER_H + 8 }, end: { x: PAGE_W - MARGIN, y: FOOTER_H + 8 }, thickness: 0.5, color: RULE });
  const txt = `Workforce Advancement Project · workforceap.org · Page ${pageNum} of ${pageCount}`;
  page.drawText(txt, { x: MARGIN, y: FOOTER_H - 2, font, size: 7, color: MUTED });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, title, toolName } = body as { text?: string; title?: string; toolName?: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load actual logo — non-blocking fallback if unavailable
    const logo = await loadLogo(pdfDoc);

    const BODY_TOP = PAGE_H - HEADER_H - 16;
    const BODY_BOTTOM = FOOTER_H + 16;
    const maxWidth = PAGE_W - MARGIN * 2;
    const bodyFontSize = 10;
    const lineHeight = bodyFontSize * 1.5;

    const wrapText = (txt: string, f: typeof font, size: number, max: number): string[] => {
      const lines: string[] = [];
      for (const paragraph of txt.split('\n')) {
        if (!paragraph.trim()) { lines.push(''); continue; }
        const words = paragraph.split(' ');
        let cur = '';
        for (const word of words) {
          const test = cur ? `${cur} ${word}` : word;
          if (f.widthOfTextAtSize(test, size) > max && cur) { lines.push(cur); cur = word; }
          else cur = test;
        }
        if (cur) lines.push(cur);
      }
      return lines;
    };

    const bodyLines = wrapText(text.replace(/\*\*/g, ''), font, bodyFontSize, maxWidth);

    // First page
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawHeader(page, boldFont, font, logo);
    let y = BODY_TOP;

    // Document title
    if (title) {
      const cleanTitle = title.replace(/\*\*/g, '');
      page.drawText(cleanTitle, { x: MARGIN, y, font: boldFont, size: 15, color: ACCENT });
      y -= 22;
    }

    // Meta line
    const genDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const meta = toolName
      ? `Generated by WorkforceAP ${toolName} · ${genDate}`
      : `Generated by Workforce Advancement Project · ${genDate}`;
    page.drawText(meta, { x: MARGIN, y, font, size: 8, color: MUTED });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: RULE });
    y -= 14;

    // Body
    for (const line of bodyLines) {
      if (y < BODY_BOTTOM) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        drawHeader(page, boldFont, font, logo);
        y = BODY_TOP;
      }
      if (!line.trim()) { y -= lineHeight * 0.6; continue; }

      const isH1 = /^#\s/.test(line);
      const isH2 = /^#{2,3}\s/.test(line);
      const clean = line.replace(/^#{1,3}\s+/, '');

      if (isH1 || isH2) {
        y -= 4;
        page.drawText(clean, { x: MARGIN, y, font: boldFont, size: isH1 ? 12 : 10.5, color: ACCENT });
        y -= (isH1 ? 18 : 16);
      } else {
        page.drawText(clean, { x: MARGIN, y, font, size: bodyFontSize, color: DARK_TEXT });
        y -= lineHeight;
      }
    }

    // Footers on all pages
    const count = pdfDoc.getPageCount();
    for (let i = 0; i < count; i++) {
      drawFooter(pdfDoc.getPage(i), font, i + 1, count);
    }

    const pdfBytes = await pdfDoc.save();
    const safeTitle = (title ?? toolName ?? 'workforceap-export')
      .replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 60).trim() || 'workforceap-export';

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[ai/export-pdf] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
