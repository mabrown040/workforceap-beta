import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getUser } from '@/lib/auth/server';
import { createApiErrorResponse, createUnauthorizedResponse } from '@/lib/api-utils';

/**
 * POST /api/ai/export-pdf
 * Body: {
 *   text: string,
 *   title?: string,
 *   toolName?: string,
 *   chartImage?: string,
 *   chartData?: RadarChartData
 * }
 * Returns: PDF with WorkforceAP logo header on each page.
 *
 * Embeds the actual /public/images/wap_logo.png in the header bar.
 * Falls back to vector text if the image cannot be loaded.
 * When chartImage (base64 data-URL PNG) is provided, it is embedded below the title.
 * When chartData is provided (and no chartImage), the radar chart is drawn natively
 * using pdf-lib primitives — far more reliable than browser SVG-to-canvas rasterization.
 */

type RadarSeries = {
  label?: string;
  values: { axis: string; value: number }[]; // value 0..1
};
type RadarChartData = {
  type: 'radar';
  // axes ordering used by the chart; if omitted, derived from the first series
  axes?: string[];
  series: RadarSeries[];
};

const ACCENT = rgb(173 / 255, 44 / 255, 77 / 255); // #ad2c4d
const DARK_TEXT = rgb(0.13, 0.13, 0.13);
const MUTED = rgb(0.52, 0.52, 0.52);
const RULE = rgb(0.87, 0.87, 0.87);

const HEADER_H = 56;
const FOOTER_H = 20;
const MARGIN = 50;
const PAGE_W = 612;
const PAGE_H = 792;

/**
 * pdf-lib's StandardFonts (Helvetica family) only support WinAnsi encoding.
 * Any character outside Windows-1252 (e.g. arrows, checkmarks, most math
 * symbols, Asian/Arabic text) makes `drawText` / `widthOfTextAtSize` throw,
 * which crashes the whole export. The Skill Mapper's comparison export, for
 * example, builds lines like "Service: 65% \u2192 80% (+15 needed)" \u2014 the
 * U+2192 arrow is not WinAnsi-encodable and used to silently break the
 * download.
 *
 * WinAnsi covers ISO-8859-1 (U+0000\u2013U+00FF) plus 27 extras in the 0x80\u20130x9F
 * range (smart quotes, em/en dash, bullet, ellipsis, euro, ...). Anything
 * outside that set needs an ASCII fallback or we'll get an encoding error.
 */
const WINANSI_EXTRA = new Set([
  0x20ac, // \u20AC
  0x201a, // \u201A
  0x0192, // \u0192
  0x201e, // \u201E
  0x2026, // \u2026
  0x2020, // \u2020
  0x2021, // \u2021
  0x02c6, // \u02C6
  0x2030, // \u2030
  0x0160, // \u0160
  0x2039, // \u2039
  0x0152, // \u0152
  0x017d, // \u017D
  0x2018, // \u2018
  0x2019, // \u2019
  0x201c, // \u201C
  0x201d, // \u201D
  0x2022, // \u2022
  0x2013, // \u2013
  0x2014, // \u2014
  0x02dc, // \u02DC
  0x2122, // \u2122
  0x0161, // \u0161
  0x203a, // \u203A
  0x0153, // \u0153
  0x017e, // \u017E
  0x0178, // \u0178
]);

/** Map common non-WinAnsi codepoints to safe ASCII so PDFs render rather than crash. */
const UNICODE_FALLBACKS: Record<string, string> = {
  '\u2192': '->', '\u2190': '<-', '\u2191': '^', '\u2193': 'v',
  '\u2194': '<->', '\u21D2': '=>', '\u21D0': '<=',
  '\u2713': 'OK', '\u2714': 'OK', '\u2717': 'X', '\u2718': 'X',
  '\u00D7': 'x', '\u00F7': '/',
  '\u2264': '<=', '\u2265': '>=', '\u2260': '!=', '\u2248': '~',
  '\u00B1': '+/-', '\u221E': 'inf',
  '\u25CF': '- ', '\u25A0': '- ', '\u25A1': '- ', '\u25CB': '- ', '\u25B6': '> ',
  '\u00A0': ' ', '\u202F': ' ', '\u2009': ' ', '\u200A': ' ',
  '\u200B': '', '\u200C': '', '\u200D': '', '\uFEFF': '',
};

/** Normalize pasted/markdown content so Helvetica renders reliably and PDFs look intentional. */
function normalizePdfExportText(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n').replace(/\*\*/g, '');
  t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  t = t.replace(/\u2022|\u25CF/g, '- ');
  for (const [src, repl] of Object.entries(UNICODE_FALLBACKS)) {
    if (t.includes(src)) t = t.split(src).join(repl);
  }
  // Final pass: any remaining codepoint outside WinAnsi gets replaced with '?'
  // rather than crashing the whole export. This is the safety net for content
  // we didn't explicitly map above (emoji, CJK, exotic math symbols, etc.).
  let out = '';
  for (const ch of t) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7f || (cp >= 0xa0 && cp <= 0xff) || WINANSI_EXTRA.has(cp) || ch === '\n' || ch === '\t') {
      out += ch;
    } else {
      out += '?';
    }
  }
  out = out.replace(/\n{4,}/g, '\n\n\n');
  return out.trim();
}

/** Sanitize a single line of text (titles, labels) \u2014 same safety as body normalization. */
function sanitizeLine(s: string): string {
  return normalizePdfExportText(s).replace(/\n+/g, ' ');
}

/**
 * Parse a "## Skill Profile" section out of free-form body text and return a
 * single-series radar payload. Callers that hit this endpoint without an
 * explicit `chartData` (e.g. the AI History download button rendering an old
 * Skill Mapper result) still get the radar visualization on top of the text.
 *
 * The pre-rename "Ethics" axis is mapped to "Service" inline so old stored
 * results render with the current axis taxonomy \u2014 matches the read-time shim
 * in app/api/member/skill-profile/route.ts.
 */
function radarFromSkillProfileText(text: string): RadarChartData | null {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const out: { axis: string; value: number }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,3}\s*Skill Profile\b/i.test(line)) { inSection = true; continue; }
    if (!inSection) continue;
    if (!line) {
      if (out.length > 0) break;
      continue;
    }
    if (/^#{1,3}\s/.test(line)) break;
    const m = line.match(/^([A-Za-z][A-Za-z &/-]{1,40}?):\s*(\d{1,3}(?:\.\d+)?)\s*%?\s*$/);
    if (!m) break;
    let axis = m[1].trim();
    if (axis === 'Ethics') axis = 'Service';
    const pct = Number(m[2]);
    if (!Number.isFinite(pct)) break;
    out.push({ axis, value: Math.max(0, Math.min(1, pct / 100)) });
  }
  if (out.length < 3) return null;
  return { type: 'radar', axes: out.map(v => v.axis), series: [{ values: out }] };
}

/** Rewrite a legacy "Ethics:" axis row to "Service:" when it appears inside a Skill Profile block. */
function rewriteLegacyAxisNames(text: string): string {
  const lines = text.split('\n');
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{1,3}\s*Skill Profile\b/i.test(line)) { inSection = true; continue; }
    if (!inSection) continue;
    if (!line) { if (i > 0 && /^#{1,3}\s/.test((lines[i + 1] ?? '').trim())) inSection = false; continue; }
    if (/^#{1,3}\s/.test(line)) { inSection = false; continue; }
    lines[i] = lines[i].replace(/^(\s*)Ethics:/, '$1Service:');
  }
  return lines.join('\n');
}

type EmbeddedLogo = Awaited<ReturnType<PDFDocument['embedPng']>> | null;

async function loadLogo(pdfDoc: PDFDocument): Promise<EmbeddedLogo> {
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'wap_logo.png');
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

/**
 * Draw a radar/spider chart natively using pdf-lib primitives.
 * Supports one or two series (single occupation or member-vs-target comparison).
 * Returns the y-coordinate after the chart (caller should set y to this value).
 */
function drawRadarChart(
  page: ReturnType<PDFDocument['getPage']>,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  data: RadarChartData,
  opts: { cx: number; cy: number; radius: number },
): void {
  const { cx, cy, radius } = opts;

  // Resolve axes
  const axes = (data.axes && data.axes.length > 0)
    ? data.axes
    : (data.series[0]?.values ?? []).map(v => v.axis);
  const n = axes.length;
  if (n < 3) return;

  // 12 o'clock start, clockwise — matches on-screen chart math
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, v: number) => ({
    x: cx + radius * v * Math.cos(angle(i)),
    y: cy - radius * v * Math.sin(angle(i)), // PDF y grows up; screen y grows down. Negate to match visual orientation.
  });

  const gridColor = rgb(0.82, 0.82, 0.84);
  const axisColor = rgb(0.78, 0.78, 0.80);
  const labelColor = rgb(0.36, 0.36, 0.38);
  const seriesColors = [
    rgb(173 / 255, 44 / 255, 77 / 255), // accent (red)
    rgb(43 / 255, 123 / 255, 185 / 255), // blue
  ];

  // Grid polygons (concentric)
  const gridLevels = [0.25, 0.5, 0.75, 1];
  for (const level of gridLevels) {
    for (let i = 0; i < n; i++) {
      const p1 = point(i, level);
      const p2 = point((i + 1) % n, level);
      page.drawLine({
        start: { x: p1.x, y: p1.y },
        end: { x: p2.x, y: p2.y },
        thickness: 0.5,
        color: gridColor,
      });
    }
  }

  // Radial axis spokes
  for (let i = 0; i < n; i++) {
    const p = point(i, 1);
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: p.x, y: p.y },
      thickness: 0.5,
      color: axisColor,
    });
  }

  // Series polygons — translucent fill + solid outline + dots, so two-series
  // comparisons read as overlapping regions (matches the on-screen DualRadarChart).
  // pdf-lib doesn't have a filled-polygon primitive but `drawSvgPath` accepts
  // a closed path with `color` (fill) + `opacity` for translucent overlay.
  data.series.forEach((series, sIdx) => {
    const stroke = seriesColors[sIdx] ?? seriesColors[0];
    const lookup = new Map(series.values.map(v => [v.axis, Math.max(0, Math.min(1, v.value))]));
    const poly: { x: number; y: number }[] = axes.map((axis, i) => point(i, lookup.get(axis) ?? 0));

    // pdf-lib's drawSvgPath applies translate(x, y) then scale(1, -1) — i.e.
    // SVG y-down semantics. To land each polygon point at its computed PDF
    // coords, pass x:0, y:0 and negate y in the path string.
    const pathData = `M ${poly[0].x} ${-poly[0].y} ` +
      poly.slice(1).map(p => `L ${p.x} ${-p.y}`).join(' ') +
      ' Z';
    page.drawSvgPath(pathData, {
      x: 0,
      y: 0,
      color: stroke,
      opacity: 0.22,
      borderColor: stroke,
      borderWidth: 1.5,
      borderOpacity: 1,
    });

    for (const p of poly) {
      page.drawCircle({ x: p.x, y: p.y, size: 2.2, color: stroke });
    }
  });

  // Axis labels (placed slightly outside the outermost ring)
  const labelSize = 8;
  axes.forEach((axisLabel, i) => {
    const label = sanitizeLine(axisLabel);
    const p = point(i, 1.18);
    let w: number;
    try {
      w = font.widthOfTextAtSize(label, labelSize);
    } catch {
      return;
    }
    page.drawText(label, {
      x: p.x - w / 2,
      y: p.y - labelSize / 3,
      font,
      size: labelSize,
      color: labelColor,
    });
  });

  // Series legend (drawn beneath the chart by caller? — we draw inline at bottom-left of the chart bbox)
  if (data.series.length > 1) {
    const legendY = cy - radius - 14;
    let legendX = cx - radius;
    data.series.forEach((series, sIdx) => {
      const color = seriesColors[sIdx] ?? seriesColors[0];
      const label = sanitizeLine(series.label ?? `Series ${sIdx + 1}`).slice(0, 28);
      page.drawRectangle({ x: legendX, y: legendY, width: 8, height: 8, color });
      page.drawText(label, {
        x: legendX + 12,
        y: legendY + 1,
        font,
        size: 8,
        color: labelColor,
      });
      legendX += 14 + font.widthOfTextAtSize(label, 8) + 14;
    });
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
    if (!user) return createUnauthorizedResponse();

    const body = await req.json();
    // Body-size cap. `text` is wrapped into PDF and `chartImage` may be a
    // base64 data URL — both can grow large. Cap at 2 MB serialized to
    // prevent giant-page DoS that ties up the PDF library + memory.
    try {
      const bodyBytes = new TextEncoder().encode(JSON.stringify(body)).byteLength;
      if (bodyBytes > 2 * 1024 * 1024) {
        return createApiErrorResponse('Input too large', 'PAYLOAD_TOO_LARGE', 413);
      }
    } catch {
      return createApiErrorResponse('Invalid body', 'VALIDATION_ERROR', 400);
    }
    const { text, title, toolName, chartImage, chartData } = body as {
      text?: string;
      title?: string;
      toolName?: string;
      chartImage?: string;
      chartData?: RadarChartData;
    };

    // Validate chartData shape — guards against malformed input that would otherwise crash
    // the drawing logic. We accept only a recognised radar shape with sensible bounds.
    const validChartData: RadarChartData | null = (() => {
      if (!chartData || typeof chartData !== 'object') return null;
      if (chartData.type !== 'radar') return null;
      if (!Array.isArray(chartData.series) || chartData.series.length === 0) return null;
      const cleanedSeries: RadarSeries[] = [];
      for (const s of chartData.series) {
        if (!s || !Array.isArray(s.values)) continue;
        const cleanedValues = s.values
          .filter(v => v && typeof v.axis === 'string' && typeof v.value === 'number' && Number.isFinite(v.value))
          .map(v => ({ axis: v.axis, value: Math.max(0, Math.min(1, v.value)) }));
        if (cleanedValues.length >= 3) {
          cleanedSeries.push({ label: typeof s.label === 'string' ? s.label : undefined, values: cleanedValues });
        }
      }
      if (cleanedSeries.length === 0) return null;
      const axes = Array.isArray(chartData.axes) && chartData.axes.every(a => typeof a === 'string')
        ? chartData.axes
        : undefined;
      return { type: 'radar', axes, series: cleanedSeries };
    })();

    if (!text || typeof text !== 'string') {
      return createApiErrorResponse('text is required', 'VALIDATION_ERROR', 400);
    }

    // Rewrite legacy "Ethics" axis rows to "Service" so old stored Skill Mapper
    // results render with the current taxonomy in both the body and the chart.
    const normalizedText = rewriteLegacyAxisNames(text);

    // If the caller didn't pass chartData but the body contains a "## Skill Profile"
    // section, synthesize a single-series radar so AI-History downloads of past
    // Skill Mapper results still get the chart they had in the original tool.
    const effectiveChartData: RadarChartData | null = validChartData
      ?? radarFromSkillProfileText(normalizedText);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load actual logo — non-blocking fallback if unavailable
    const logo = await loadLogo(pdfDoc);

    // Optionally embed a chart PNG (sent as base64 data URL)
    let chartPng: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    if (chartImage && typeof chartImage === 'string' && chartImage.startsWith('data:image/png')) {
      try {
        const b64 = chartImage.split(',')[1];
        const bytes = Buffer.from(b64, 'base64');
        chartPng = await pdfDoc.embedPng(bytes);
      } catch {
        /* non-fatal — skip chart */
      }
    }

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

    const bodyLines = wrapText(normalizePdfExportText(normalizedText), font, bodyFontSize, maxWidth);

    // First page
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawHeader(page, boldFont, font, logo);
    let y = BODY_TOP;

    // Document title
    if (title) {
      const cleanTitle = sanitizeLine(title);
      page.drawText(cleanTitle, { x: MARGIN, y, font: boldFont, size: 15, color: ACCENT });
      y -= 22;
    }

    // Meta line
    const genDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const meta = sanitizeLine(toolName
      ? `Generated by WorkforceAP ${toolName} · ${genDate}`
      : `Generated by Workforce Advancement Project · ${genDate}`);
    page.drawText(meta, { x: MARGIN, y, font, size: 8, color: MUTED });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: RULE });
    y -= 14;

    // Embed chart image if provided (centered, 220px wide)
    if (chartPng) {
      const chartW = 220;
      const chartH = 220;
      if (y - chartH < BODY_BOTTOM) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        drawHeader(page, boldFont, font, logo);
        y = BODY_TOP;
      }
      y -= chartH;
      page.drawImage(chartPng, {
        x: (PAGE_W - chartW) / 2,
        y,
        width: chartW,
        height: chartH,
      });
      y -= 16;
    } else if (effectiveChartData) {
      // Draw the radar chart natively with pdf-lib primitives (preferred — works without
      // a browser canvas round-trip). Box: ~260pt tall to leave room for axis labels & legend.
      const radius = 80;
      const labelPadding = 28; // extra room above & below for axis labels
      const legendPadding = effectiveChartData.series.length > 1 ? 18 : 0;
      const chartBoxH = radius * 2 + labelPadding * 2 + legendPadding;
      if (y - chartBoxH < BODY_BOTTOM) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        drawHeader(page, boldFont, font, logo);
        y = BODY_TOP;
      }
      const cx = PAGE_W / 2;
      const cy = y - labelPadding - radius;
      drawRadarChart(page, font, effectiveChartData, { cx, cy, radius });
      y -= chartBoxH;
      y -= 8;
    }

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
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
