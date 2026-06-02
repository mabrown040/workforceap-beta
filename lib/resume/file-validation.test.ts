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

test('validates valid docx', () => {
    const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]);
    assert.equal(validateFileType(buf, 'application/docx', 'test.docx'), true);
});

test('validates valid pdf with UTF-8 BOM', () => {
    const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x25, 0x50, 0x44, 0x46, 0x00]);
    assert.equal(validateFileType(buf, 'application/pdf', 'test.pdf'), true);
});

test('rejects invalid pdf', () => {
    const buf = Buffer.from([0x00, 0x00, 0x44, 0x46, 0x00, 0x00]);
    assert.equal(validateFileType(buf, 'application/pdf', 'test.pdf'), false);
});
