import { Buffer } from 'node:buffer';

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt']);

// Magic bytes for allowed file types
export const MAGIC_BYTES: Array<{ ext: string; bytes: number[] }> = [
  { ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: 'doc', bytes: [0xD0, 0xCF, 0x11, 0xE0] }, // OLE2 (DOC)
  { ext: 'docx', bytes: [0x50, 0x4B, 0x03, 0x04] }, // PK (ZIP/DOCX)
];

export function validateFileType(buffer: Buffer, mimeType: string, fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;

  // For txt files, skip magic bytes check as text files do not have standard magic bytes
  if (ext === 'txt') {
    // Basic sanity check on mime type for txt files, since they lack magic bytes
    if (mimeType && !['text/plain', 'application/octet-stream'].includes(mimeType) && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return false;
    }
    return true;
  }

  // Check magic bytes
  if (buffer.length < 4) return false;
  return MAGIC_BYTES.some(
    (m) => m.ext === ext && m.bytes.every((b, i) => buffer[i] === b)
  );
}
