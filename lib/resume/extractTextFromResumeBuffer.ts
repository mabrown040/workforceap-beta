import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { Worker } from 'node:worker_threads';
import { createInflateRaw } from 'node:zlib';
import { sanitizeResumePlainText } from './extractionQuality';

const MAX_EXTRACTED_RESUME_TEXT_CHARS = 500_000;
const MAX_PDF_RESUME_PAGES = 30;
/**
 * Raised from 8s: pdfjs-dist is a far larger module than the old parser and
 * loads inside the worker, so a cold serverless start pays that import cost
 * before the first page is read. The cap still bounds a hostile file.
 */
const PDF_PARSE_TIMEOUT_MS = 20_000;
const MAX_DOCX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;
const MAX_DOCX_COMPRESSED_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_DOCX_ENTRIES = 8192;
const MAX_DOCX_XML_TOKENS = 100_000;
/**
 * Modern pdf.js (pdfjs-dist), not pdf-parse.
 *
 * pdf-parse bundles pdf.js builds from 2018 (newest v2.0.550). Production was
 * rejecting real member resumes with "bad XRef entry", "Command token too
 * long" and "Illegal character" — files that current PDF producers (Word,
 * Canva, Google Docs, macOS Preview) emit routinely. pdfjs-dist reads those
 * same files, and extracts more text from the ones pdf-parse could already
 * handle.
 */

const PDF_WORKER_SOURCE = String.raw`
  const { parentPort, workerData } = require('node:worker_threads');
  const { pathToFileURL } = require('node:url');
  (async () => {
    try {
      // Resolved here, not in the importing module: webpack rewrites
      // require.resolve() into an internal numeric module id, so any path
      // computed at module scope arrives as a number inside the bundle.
      // For an eval worker Node resolves bare specifiers from process.cwd().
      const { createRequire } = require('node:module');
      const resolveFrom = createRequire(workerData.cwd + '/package.json');
      const entry = resolveFrom.resolve('pdfjs-dist/legacy/build/pdf.mjs');
      const pdfjs = await import(pathToFileURL(entry).href);
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(workerData.bytes),
        // No eval, no network font fetches, no system font probing: this
        // parses untrusted member uploads inside a memory-capped worker.
        isEvalSupported: false,
        useSystemFonts: false,
        disableFontFace: true,
      }).promise;
      try {
        const pageCount = Math.min(doc.numPages, workerData.maxPages);
        let text = '';
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          const page = await doc.getPage(pageNumber);
          const content = await page.getTextContent();
          // Concatenate runs and break only where pdf.js reports a line end.
          // Joining every item with a space instead would split words and
          // hex codes apart ("#1 a 1 a 1 a"), degrading what the AI tools read.
          for (const item of content.items) {
            if (!('str' in item)) continue;
            text += item.str;
            if (item.hasEOL) text += String.fromCharCode(10);
          }
          text += String.fromCharCode(10);
          page.cleanup();
          if (text.length > workerData.maxTextChars) {
            parentPort.postMessage({ ok: false, code: 'unsafe_extraction' });
            return;
          }
        }
        parentPort.postMessage({ ok: true, text });
      } finally {
        await doc.destroy();
      }
    } catch {
      parentPort.postMessage({ ok: false, code: 'invalid_pdf' });
    }
  })();
`;

export type ResumeTextExtractionErrorCode =
  | 'invalid_pdf'
  | 'invalid_docx'
  | 'unsupported_doc'
  | 'invalid_text_encoding'
  | 'unsafe_extraction'
  | 'unsupported_type';

export class ResumeTextExtractionError extends Error {
  readonly code: ResumeTextExtractionErrorCode;

  constructor(code: ResumeTextExtractionErrorCode) {
    super('Resume text could not be extracted safely.');
    this.name = 'ResumeTextExtractionError';
    this.code = code;
  }
}

function safeParserOutput(text: string): string {
  if (text.length > MAX_EXTRACTED_RESUME_TEXT_CHARS) {
    throw new ResumeTextExtractionError('unsafe_extraction');
  }
  const safe = sanitizeResumePlainText(text);
  if (text.trim() && !safe) throw new ResumeTextExtractionError('unsafe_extraction');
  return safe;
}

async function parsePdfInBoundedWorker(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(PDF_WORKER_SOURCE, {
      eval: true,
      workerData: {
        cwd: process.cwd(),
        bytes: buf,
        maxPages: MAX_PDF_RESUME_PAGES,
        maxTextChars: MAX_EXTRACTED_RESUME_TEXT_CHARS,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      },
    });

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void worker.terminate();
      callback();
    };
    const timeout = setTimeout(() => {
      finish(() => reject(new ResumeTextExtractionError('unsafe_extraction')));
    }, PDF_PARSE_TIMEOUT_MS);

    worker.once('message', (message: { ok?: boolean; text?: unknown; code?: unknown }) => {
      if (message.ok && typeof message.text === 'string') {
        finish(() => resolve(message.text as string));
        return;
      }
      const code = message.code === 'unsafe_extraction' ? 'unsafe_extraction' : 'invalid_pdf';
      finish(() => reject(new ResumeTextExtractionError(code)));
    });
    worker.once('error', () => {
      finish(() => reject(new ResumeTextExtractionError('invalid_pdf')));
    });
    worker.once('exit', (code) => {
      if (code !== 0) finish(() => reject(new ResumeTextExtractionError('unsafe_extraction')));
    });
  });
}

interface DocxDocumentEntry {
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
  flags: number;
}

function docxFailure(code: 'invalid_docx' | 'unsafe_extraction' = 'invalid_docx'): never {
  throw new ResumeTextExtractionError(code);
}

function findZipEocd(buf: Buffer): number {
  const minimum = Math.max(0, buf.length - (22 + 0xffff));
  for (let offset = buf.length - 22; offset >= minimum; offset -= 1) {
    if (buf.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function findDocxDocumentEntry(buf: Buffer): DocxDocumentEntry {
  const eocdOffset = findZipEocd(buf);
  if (eocdOffset < 0 || eocdOffset + 22 > buf.length) docxFailure();

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralSize = buf.readUInt32LE(eocdOffset + 12);
  const centralOffset = buf.readUInt32LE(eocdOffset + 16);
  const centralEnd = centralOffset + centralSize;
  if (totalEntries === 0 || totalEntries > MAX_DOCX_ENTRIES) docxFailure('unsafe_extraction');
  if (centralOffset >= buf.length || centralEnd > buf.length) docxFailure();

  let cursor = centralOffset;
  let documentEntry: DocxDocumentEntry | null = null;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > centralEnd || buf.readUInt32LE(cursor) !== 0x02014b50) docxFailure();
    const flags = buf.readUInt16LE(cursor + 8);
    const compressionMethod = buf.readUInt16LE(cursor + 10);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const nameLength = buf.readUInt16LE(cursor + 28);
    const extraLength = buf.readUInt16LE(cursor + 30);
    const commentLength = buf.readUInt16LE(cursor + 32);
    const localHeaderOffset = buf.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > centralEnd) docxFailure();
    const name = buf.subarray(nameStart, nameEnd).toString('utf8');

    if (name === 'word/document.xml') {
      if (documentEntry) docxFailure();
      if ((flags & 0x1) !== 0 || ![0, 8].includes(compressionMethod)) docxFailure();
      if (compressedSize === 0 || compressedSize > MAX_DOCX_COMPRESSED_ENTRY_BYTES) {
        docxFailure('unsafe_extraction');
      }
      documentEntry = { compressionMethod, compressedSize, localHeaderOffset, flags };
    }

    cursor = nameEnd + extraLength + commentLength;
    if (cursor > centralEnd) docxFailure();
  }
  if (!documentEntry) docxFailure();
  return documentEntry;
}

async function inflateRawWithLimit(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inflate = createInflateRaw();
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const fail = (code: 'invalid_docx' | 'unsafe_extraction') => {
      if (settled) return;
      settled = true;
      inflate.destroy();
      reject(new ResumeTextExtractionError(code));
    };

    inflate.on('data', (chunk: Buffer) => {
      if (settled) return;
      total += chunk.length;
      if (total > MAX_DOCX_DOCUMENT_XML_BYTES) {
        fail('unsafe_extraction');
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    inflate.once('error', () => fail('invalid_docx'));
    inflate.once('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks, total));
    });
    inflate.end(input);
  });
}

async function readDocxDocumentXml(buf: Buffer): Promise<string> {
  const entry = findDocxDocumentEntry(buf);
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buf.length || buf.readUInt32LE(offset) !== 0x04034b50) docxFailure();
  const localFlags = buf.readUInt16LE(offset + 6);
  const localMethod = buf.readUInt16LE(offset + 8);
  const nameLength = buf.readUInt16LE(offset + 26);
  const extraLength = buf.readUInt16LE(offset + 28);
  if (localFlags !== entry.flags || localMethod !== entry.compressionMethod) docxFailure();

  const nameStart = offset + 30;
  const nameEnd = nameStart + nameLength;
  const dataStart = nameEnd + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (nameEnd > buf.length || dataEnd > buf.length) docxFailure();
  if (buf.subarray(nameStart, nameEnd).toString('utf8') !== 'word/document.xml') docxFailure();

  const compressed = buf.subarray(dataStart, dataEnd);
  const xmlBytes = entry.compressionMethod === 0
    ? Buffer.from(compressed)
    : await inflateRawWithLimit(compressed);
  if (xmlBytes.length > MAX_DOCX_DOCUMENT_XML_BYTES) docxFailure('unsafe_extraction');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(xmlBytes);
  } catch {
    docxFailure();
  }
}

function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(?:#x([0-9a-f]+)|#([0-9]+)|amp|lt|gt|quot|apos);/gi,
    (entity, hex: string | undefined, decimal: string | undefined) => {
      if (hex || decimal) {
        const codePoint = Number.parseInt(hex ?? decimal ?? '', hex ? 16 : 10);
        return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : '';
      }
      const named: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
      };
      return named[entity.toLowerCase()] ?? '';
    },
  );
}

function findXmlTagEnd(xml: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = start; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function xmlTagName(rawTag: string): { closing: boolean; name: string; selfClosing: boolean } {
  const trimmed = rawTag.trim();
  const closing = trimmed.startsWith('/');
  const body = closing ? trimmed.slice(1).trimStart() : trimmed;
  const boundary = body.search(/[\s/]/);
  const name = (boundary < 0 ? body : body.slice(0, boundary)).toLowerCase();
  return { closing, name, selfClosing: /\/\s*$/.test(body) };
}

function docxXmlToPlainText(xml: string): string {
  const parts: string[] = [];
  let extractedCharacters = 0;
  let cursor = 0;
  let tokenCount = 0;
  let sawDocument = false;

  const append = (part: string) => {
    extractedCharacters += part.length;
    if (extractedCharacters > MAX_EXTRACTED_RESUME_TEXT_CHARS) docxFailure('unsafe_extraction');
    parts.push(part);
  };

  while (cursor < xml.length) {
    const tagStart = xml.indexOf('<', cursor);
    if (tagStart < 0) break;
    const tagEnd = findXmlTagEnd(xml, tagStart + 1);
    if (tagEnd < 0) docxFailure();
    tokenCount += 1;
    if (tokenCount > MAX_DOCX_XML_TOKENS) docxFailure('unsafe_extraction');

    const tag = xmlTagName(xml.slice(tagStart + 1, tagEnd));
    if (!tag.closing && tag.name === 'w:document') sawDocument = true;

    if (!tag.closing && tag.name === 'w:t' && !tag.selfClosing) {
      const closingStart = xml.indexOf('</w:t', tagEnd + 1);
      if (closingStart < 0) docxFailure();
      const closingEnd = findXmlTagEnd(xml, closingStart + 1);
      if (closingEnd < 0) docxFailure();
      const closingTag = xmlTagName(xml.slice(closingStart + 1, closingEnd));
      if (!closingTag.closing || closingTag.name !== 'w:t') docxFailure();
      const rawText = xml.slice(tagEnd + 1, closingStart);
      if (rawText.includes('<')) docxFailure();
      append(decodeXmlEntities(rawText));
      cursor = closingEnd + 1;
      continue;
    }

    if ((!tag.closing && tag.name === 'w:tab') || (tag.closing && tag.name === 'w:tc')) {
      append('\t');
    } else if ((!tag.closing && (tag.name === 'w:br' || tag.name === 'w:cr'))
      || (tag.closing && (tag.name === 'w:p' || tag.name === 'w:tr'))) {
      append('\n');
    }
    cursor = tagEnd + 1;
  }
  if (!sawDocument) docxFailure();
  return parts.join('');
}

/**
 * Extract plain text from a resume file buffer (same rules as `/api/ai/extract-resume-text`).
 */
export async function extractTextFromResumeBuffer(buffer: Buffer | Uint8Array, ext: string): Promise<string> {
  const e = ext.toLowerCase().replace(/^\./, '');

  // ensure we have a node Buffer instead of a raw Uint8Array polyfill
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (e === 'pdf') {
    try {
      const text = await parsePdfInBoundedWorker(buf);
      return safeParserOutput(text);
    } catch (error) {
      if (error instanceof ResumeTextExtractionError) throw error;
      throw new ResumeTextExtractionError('invalid_pdf');
    }
  }

  if (e === 'doc') {
    throw new ResumeTextExtractionError('unsupported_doc');
  }

  if (e === 'docx') {
    try {
      const xml = await readDocxDocumentXml(buf);
      return safeParserOutput(docxXmlToPlainText(xml));
    } catch (error) {
      if (error instanceof ResumeTextExtractionError) throw error;
      throw new ResumeTextExtractionError('invalid_docx');
    }
  }

  if (e === 'txt' || e === 'text') {
    let decoded: string;
    try {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
      throw new ResumeTextExtractionError('invalid_text_encoding');
    }
    return safeParserOutput(decoded);
  }

  throw new ResumeTextExtractionError('unsupported_type');
}
