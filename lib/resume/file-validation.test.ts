import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { validateFileType } from './file-validation';

test('validates valid pdf', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x00]);
    assert.equal(validateFileType(buf, 'application/pdf', 'test.pdf'), true);
});

test('validates valid pdf with upper case ext', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x00]);
    assert.equal(validateFileType(buf, 'application/pdf', 'test.PDF'), true);
});

// --- DOCX structural validation helpers (H-S17) ----------------------------
// Build a minimal in-memory ZIP archive (store / no compression) containing
// the provided entries. Sufficient to exercise central-directory parsing.
function buildZip(entries: Array<{ name: string; data?: Buffer }>): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name, 'utf8');
        const data = entry.data ?? Buffer.alloc(0);

        // Local file header (30 bytes + name + data)
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);   // signature
        local.writeUInt16LE(20, 4);            // version needed
        local.writeUInt16LE(0, 6);             // flags
        local.writeUInt16LE(0, 8);             // compression: stored
        local.writeUInt16LE(0, 10);            // mod time
        local.writeUInt16LE(0, 12);            // mod date
        local.writeUInt32LE(0, 14);            // crc32 (unchecked by our parser)
        local.writeUInt32LE(data.length, 18);  // compressed size
        local.writeUInt32LE(data.length, 22);  // uncompressed size
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);            // extra length
        localParts.push(local, nameBuf, data);

        // Central directory entry (46 bytes + name)
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);  // signature
        central.writeUInt16LE(20, 4);           // version made by
        central.writeUInt16LE(20, 6);           // version needed
        central.writeUInt16LE(0, 8);            // flags
        central.writeUInt16LE(0, 10);           // compression
        central.writeUInt16LE(0, 12);           // mod time
        central.writeUInt16LE(0, 14);           // mod date
        central.writeUInt32LE(0, 16);           // crc32
        central.writeUInt32LE(data.length, 20); // compressed size
        central.writeUInt32LE(data.length, 24); // uncompressed size
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt16LE(0, 30);           // extra length
        central.writeUInt16LE(0, 32);           // comment length
        central.writeUInt16LE(0, 34);           // disk number
        central.writeUInt16LE(0, 36);           // internal attrs
        central.writeUInt32LE(0, 38);           // external attrs
        central.writeUInt32LE(offset, 42);      // offset of local header
        centralParts.push(central, nameBuf);

        offset += local.length + nameBuf.length + data.length;
    }

    const cdStart = offset;
    const centralBuf = Buffer.concat(centralParts);

    // End of central directory record (22 bytes, no comment)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);                   // disk
    eocd.writeUInt16LE(0, 6);                   // disk with CD
    eocd.writeUInt16LE(entries.length, 8);      // entries on disk
    eocd.writeUInt16LE(entries.length, 10);     // total entries
    eocd.writeUInt32LE(centralBuf.length, 12);  // CD size
    eocd.writeUInt32LE(cdStart, 16);            // CD offset
    eocd.writeUInt16LE(0, 20);                  // comment length

    return Buffer.concat([...localParts, centralBuf, eocd]);
}

function findSignature(buffer: Buffer, signature: number, start = 0): number {
    for (let i = start; i <= buffer.length - 4; i++) {
        if (buffer.readUInt32LE(i) === signature) return i;
    }
    return -1;
}

function patchCentralSizes(buffer: Buffer, entryIndex: number, compressed: number, uncompressed: number): Buffer {
    const copy = Buffer.from(buffer);
    let cursor = 0;
    for (let i = 0; i <= entryIndex; i++) {
        cursor = findSignature(copy, 0x02014b50, cursor);
        assert.notEqual(cursor, -1);
        if (i < entryIndex) cursor += 46;
    }
    copy.writeUInt32LE(compressed, cursor + 20);
    copy.writeUInt32LE(uncompressed, cursor + 24);
    return copy;
}

test('validates valid docx (contains [Content_Types].xml and word/document.xml)', () => {
    const buf = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: '_rels/.rels', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    assert.equal(validateFileType(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'test.docx'), true);
});

test('rejects bare PK magic bytes posing as docx (H-S17)', () => {
    const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]);
    assert.equal(validateFileType(buf, 'application/docx', 'test.docx'), false);
});

test('rejects arbitrary ZIP renamed to .docx (H-S17)', () => {
    // A perfectly valid ZIP containing only an unrelated file — the canonical
    // exploit shape flagged by the audit: `evil.zip` → `evil.docx`.
    const buf = buildZip([
        { name: 'evil.txt', data: Buffer.from('payload') },
        { name: 'nested/other.bin', data: Buffer.from([0x00, 0x01, 0x02]) },
    ]);
    assert.equal(validateFileType(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'evil.docx'), false);
});

test('rejects docx missing word/document.xml (H-S17)', () => {
    const buf = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
    ]);
    assert.equal(validateFileType(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'partial.docx'), false);
});

test('rejects docx missing [Content_Types].xml (H-S17)', () => {
    const buf = buildZip([
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    assert.equal(validateFileType(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'partial.docx'), false);
});

test('rejects DOCX archives whose declared expansion exceeds 25MB', () => {
    const base = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    const bomb = patchCentralSizes(base, 1, 1024 * 1024, 26 * 1024 * 1024);
    assert.equal(validateFileType(bomb, 'application/zip', 'bomb.docx'), false);
});

test('rejects DOCX archives with a cumulative compression ratio above 100', () => {
    const base = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    const bomb = patchCentralSizes(base, 1, 1_000, 200_000);
    assert.equal(validateFileType(bomb, 'application/zip', 'ratio-bomb.docx'), false);
});

test('rejects non-empty DOCX entries declaring zero compressed bytes', () => {
    const base = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    const bomb = patchCentralSizes(base, 1, 0, 100);
    assert.equal(validateFileType(bomb, 'application/zip', 'zero-compressed.docx'), false);
});

test('rejects DOCX archives declaring more than 8192 entries', () => {
    const bomb = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    const eocd = findSignature(bomb, 0x06054b50);
    assert.notEqual(eocd, -1);
    bomb.writeUInt16LE(8193, eocd + 8);
    bomb.writeUInt16LE(8193, eocd + 10);
    assert.equal(validateFileType(bomb, 'application/zip', 'too-many.docx'), false);
});

test('rejects a malformed DOCX central-directory cursor after required entries', () => {
    const malformed = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<xml/>') },
    ]);
    const second = findSignature(malformed, 0x02014b50, findSignature(malformed, 0x02014b50) + 4);
    assert.notEqual(second, -1);
    malformed.writeUInt16LE(0xffff, second + 28);
    assert.equal(validateFileType(malformed, 'application/zip', 'malformed.docx'), false);
});

test('accepts a structurally normal compressed-size DOCX within safety limits', () => {
    let normal = buildZip([
        { name: '[Content_Types].xml', data: Buffer.from('<xml/>') },
        { name: 'word/document.xml', data: Buffer.from('<document/>') },
    ]);
    normal = patchCentralSizes(normal, 0, 20, 200);
    normal = patchCentralSizes(normal, 1, 30, 300);
    assert.equal(validateFileType(normal, 'application/zip', 'normal.docx'), true);
});

test('validates valid pdf with UTF-8 BOM', () => {
    const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x25, 0x50, 0x44, 0x46, 0x00]);
    assert.equal(validateFileType(buf, 'application/pdf', 'test.pdf'), true);
});

test('rejects invalid pdf', () => {
    const buf = Buffer.from([0x00, 0x00, 0x44, 0x46, 0x00, 0x00]);
    assert.equal(validateFileType(buf, 'application/pdf', 'test.pdf'), false);
});

test('rejects txt by default', () => {
    const buf = Buffer.from('resume text');
    assert.equal(validateFileType(buf, 'text/plain', 'resume.txt'), false);
});

test('allows txt when explicitly enabled', () => {
    const buf = Buffer.from('resume text');
    assert.equal(validateFileType(buf, 'text/plain', 'resume.txt', { allowTxt: true }), true);
});
