import test from 'node:test';
import assert from 'node:assert/strict';
import { dataToCsv, csvDownloadResponse, exportFilename } from './export';

test('dataToCsv produces correct CSV with headers', () => {
  const csv = dataToCsv(
    [
      { key: 'name', header: 'Name', accessor: (r: { name: string }) => r.name },
      { key: 'age', header: 'Age', accessor: (r: { age: number }) => r.age },
    ],
    [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ],
  );
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'Name,Age');
  assert.equal(lines[1], 'Alice,30');
  assert.equal(lines[2], 'Bob,25');
});

test('dataToCsv escapes commas and quotes', () => {
  const csv = dataToCsv(
    [
      { key: 'note', header: 'Note', accessor: (r: { note: string }) => r.note },
    ],
    [
      { note: 'Has, comma' },
      { note: 'Has "quotes"' },
      { note: 'Has\nnewline' },
    ],
  );
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[1], '"Has, comma"');
  assert.equal(lines[2], '"Has ""quotes"""');
  assert.equal(lines[3], '"Has\nnewline"');
});

test('dataToCsv handles null, undefined, booleans, and dates', () => {
  const csv = dataToCsv(
    [
      { key: 'a', header: 'A', accessor: (r: { a: unknown }) => r.a as any },
      { key: 'b', header: 'B', accessor: (r: { b: unknown }) => r.b as any },
    ],
    [
      { a: null, b: true },
      { a: undefined, b: false },
      { a: new Date('2026-05-13'), b: null },
    ],
  );
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[1], ',Yes');
  assert.equal(lines[2], ',No');
  assert.equal(lines[3], '2026-05-13,');
});

test('dataToCsv includes branding when options provided', () => {
  const csv = dataToCsv(
    [{ key: 'x', header: 'X', accessor: (r: { x: number }) => r.x }],
    [{ x: 1 }],
    { reportTitle: 'Test Report', notes: 'Note line' },
  );
  assert.ok(csv.includes('# Workforce Advancement Project — Test Report'));
  assert.ok(csv.includes('# Note line'));
});

test('csvDownloadResponse returns NextResponse with correct headers', () => {
  const res = csvDownloadResponse('a,b\nc,d', 'test.csv');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/csv; charset=utf-8');
  assert.equal(res.headers.get('Content-Disposition'), 'attachment; filename="test.csv"');
});

test('csvDownloadResponse adds truncation headers when truncated', () => {
  const res = csvDownloadResponse('a,b', 'test.csv', { truncated: true, limit: 100 });
  assert.equal(res.headers.get('X-Export-Truncated'), 'true');
  assert.equal(res.headers.get('X-Export-Limit'), '100');
});

test('exportFilename formats correctly', () => {
  const name = exportFilename('members');
  assert.ok(name.startsWith('members-'));
  assert.ok(name.endsWith('.csv'));
  assert.match(name, /^members-\d{4}-\d{2}-\d{2}\.csv$/);
});
