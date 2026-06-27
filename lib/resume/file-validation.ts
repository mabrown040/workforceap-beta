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

export function validateFileType(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  fileName: string,
  options: { allowTxt?: boolean } = {}
): boolean {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;

  if (ext === 'txt') {
    return options?.allowTxt === true;
  }

  if (buf.length < 4) return false;

  // Some files might contain a UTF-8 BOM or some padding before the actual magic bytes.
  // We search for the magic bytes within the first 1024 bytes of the file.
  const searchLimit = Math.min(buf.length, 1024);
  const searchArea = buf.subarray(0, searchLimit);

  const magicMatches = MAGIC_BYTES.some((m) => {
    if (m.ext !== ext) return false;

    const seq = m.bytes;
    const seqLen = seq.length;

    // Safely search for byte sequences by implementing a custom manual loop (byte-by-byte comparison)
    // to avoid edge polyfill indexOf issues with arrays
    for (let i = 0; i <= searchArea.length - seqLen; i++) {
      let match = true;
      for (let j = 0; j < seqLen; j++) {
        if (searchArea[i + j] !== seq[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }

    return false;
  });

  if (!magicMatches) return false;

  // H-S17: DOCX files share the ZIP magic bytes (PK\x03\x04) with any ZIP archive.
  // A malicious ZIP renamed to .docx would otherwise pass validation and be fed
  // to `mammoth` downstream. Confirm the archive is actually a DOCX by checking
  // for the canonical DOCX entries in the ZIP central directory.
  if (ext === 'docx') {
    return isDocxArchive(buf);
  }

  return true;
}

/**
 * Lightweight DOCX structure check. Parses the ZIP central directory and
 * verifies that BOTH `[Content_Types].xml` AND `word/document.xml` are
 * present as entries. This is sufficient to distinguish a real DOCX from
 * an arbitrary ZIP archive without pulling in a full unzip dependency.
 *
 * ZIP central directory record layout (little-endian):
 *   0  uint32  signature           0x02014b50
 *   28 uint16  file name length
 *   30 uint16  extra field length
 *   32 uint16  file comment length
 *   46 ...     file name (N bytes)
 *
 * End-of-central-directory record (EOCD), searched from end of file:
 *   0  uint32  signature           0x06054b50
 *   16 uint32  offset of central directory
 */
function isDocxArchive(buffer: Buffer | Uint8Array): boolean {
  const REQUIRED_ENTRIES = ['[Content_Types].xml', 'word/document.xml'];

  try {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const eocdOffset = findEocd(buf, view);
    if (eocdOffset < 0) return false;

    // EOCD must have at least 22 bytes available
    if (eocdOffset + 22 > buf.length) return false;

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdSize = view.getUint32(eocdOffset + 12, true);
    const totalEntries = view.getUint16(eocdOffset + 10, true);

    if (cdOffset >= buf.length || cdOffset + cdSize > buf.length) {
      return false;
    }

    const found = new Set<string>();
    let cursor = cdOffset;
    const cdEnd = cdOffset + cdSize;
    const CENTRAL_DIR_SIGNATURE = 0x02014b50;
    const HEADER_FIXED_LEN = 46;
    // Cap entries we scan to avoid pathological inputs
    const maxEntries = Math.min(totalEntries, 8192);

    for (let i = 0; i < maxEntries; i++) {
      if (cursor + HEADER_FIXED_LEN > cdEnd) break;
      const sig = view.getUint32(cursor, true);
      if (sig !== CENTRAL_DIR_SIGNATURE) break;

      const nameLen = view.getUint16(cursor + 28, true);
      const extraLen = view.getUint16(cursor + 30, true);
      const commentLen = view.getUint16(cursor + 32, true);
      const nameStart = cursor + HEADER_FIXED_LEN;
      const nameEnd = nameStart + nameLen;
      if (nameEnd > cdEnd) break;

      const nameBytes = new Uint8Array(buf.buffer, buf.byteOffset + nameStart, nameLen);
      let name = '';
      if (typeof TextDecoder !== 'undefined') {
        name = new TextDecoder('utf-8').decode(nameBytes);
      } else {
        for (let k = 0; k < nameLen; k++) name += String.fromCharCode(nameBytes[k]);
      }

      if (REQUIRED_ENTRIES.includes(name)) {
        found.add(name);
        if (found.size === REQUIRED_ENTRIES.length) return true;
      }

      cursor = nameEnd + extraLen + commentLen;
    }

    return REQUIRED_ENTRIES.every((e) => found.has(e));
  } catch {
    return false;
  }
}

/**
 * Locate the End-of-Central-Directory record signature (0x06054b50)
 * by scanning backwards from the end of the buffer. The EOCD lives in
 * the last 22 + up-to-65535 bytes (its trailing comment is variable).
 */
function findEocd(buffer: Buffer | Uint8Array, view: DataView): number {
  const EOCD_SIGNATURE = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - (22 + 0xffff));
  for (let i = buffer.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      return i;
    }
  }
  return -1;
}
