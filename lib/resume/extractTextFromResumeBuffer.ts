import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { sanitizeResumePlainText } from './extractionQuality';

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
  const safe = sanitizeResumePlainText(text);
  if (text.trim() && !safe) throw new ResumeTextExtractionError('unsafe_extraction');
  return safe;
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
      const data = await pdfParse(buf);
      return safeParserOutput(data.text ?? '');
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
      const result = await mammoth.extractRawText({ buffer: buf });
      return safeParserOutput(result.value ?? '');
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
