import { Buffer } from 'node:buffer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

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
      return (data.text?.trim() || '') as string;
    } catch (err) {
      console.error('Error parsing PDF:', err);
      const raw = buf.toString('binary');
      return raw
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  }

  if (e === 'docx' || e === 'doc') {
    try {
      if (e === 'doc') throw new Error('Mammoth does not support .doc files natively');
      const result = await mammoth.extractRawText({ buffer: buf });
      return (result.value?.trim() || '') as string;
    } catch (err) {
      console.error(`Error parsing ${e}:`, err);
      const raw = buf.toString('binary');
      return raw
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  }

  if (e === 'txt' || e === 'text') {
    return buf.toString('utf-8').trim();
  }

  return buf.toString('utf-8').trim();
}
