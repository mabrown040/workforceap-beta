import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCsv,
  parseCuratedCollectionsCsv,
  parseExportFileName,
  serializeCuratedCollectionsModule,
} from './curatedCollectionsCsv';

const HEADER =
  'Collection ID,Collection Name,Item Type,Item ID,Item Name,Item Slug,Partner Name,Part Of A Specialization,Part Of Specialization ID,Part Of Specialization Name,Course Deeplink,Duration,For-credit,Auto-enrollment,Start Date,End Date,Course Difficulty Level';

const FILE_NAME = 'CuratedCollections-TpIlAogTQ8-SJQKIE8PP9w-1789682740249.csv';

function row(cells: Record<string, string>): string {
  const columns = HEADER.split(',');
  return columns
    .map((column) => {
      const value = cells[column] ?? '';
      return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    })
    .join(',');
}

test('parseCsv handles quotes, doubled quotes, embedded commas and newlines, CRLF and a BOM', () => {
  const text = '﻿a,b,c\r\n1,"x, y","say ""hi""\nthere"\r\n\r\n2,,\n';
  assert.deepEqual(parseCsv(text), [
    ['a', 'b', 'c'],
    ['1', 'x, y', 'say "hi"\nthere'],
    ['2', '', ''],
  ]);
  assert.throws(() => parseCsv('a,"unterminated'), /quoted field/);
});

test('reads the export file name for the program id and export time', () => {
  assert.deepEqual(parseExportFileName(FILE_NAME), {
    programId: 'TpIlAogTQ8-SJQKIE8PP9w',
    exportedAt: '2026-09-17T22:05:40.249Z',
  });
  assert.equal(parseExportFileName('something-else.csv'), null);
});

test('groups course rows into collections in export order and keeps Coursera\'s course order', () => {
  const csv = [
    HEADER,
    row({ 'Collection ID': 'JpPZG', 'Collection Name': 'CompTIA A+ Professional Certificate (CompTIA A+)', 'Item Type': 'COURSE', 'Item ID': '7sBiclFIEeetjQ5ppGVTyA', 'Item Name': 'Technical Support Fundamentals', 'Item Slug': 'technical-support-fundamentals', 'Partner Name': 'Google', 'Part Of Specialization ID': '8DhEU2gRRQShooqlqIcKrQ,UszQQ61wEe2O-BL57hX6Tw', Duration: '13' }),
    row({ 'Collection ID': '0lodU', 'Collection Name': 'IT Support Professional Certificate (IBM)', 'Item Type': 'COURSE', 'Item ID': 'rNyuLa-pEeytqw64hz8ZCw', 'Item Name': 'Introduction to Technical Support ', 'Item Slug': 'introduction-to-technical-support', 'Partner Name': 'IBM', Duration: '' }),
    row({ 'Collection ID': 'JpPZG', 'Collection Name': 'CompTIA A+ Professional Certificate (CompTIA A+)', 'Item Type': 'COURSE', 'Item ID': 'ySI6pmchEe--dw7PPVphLw', 'Item Name': "The Absolute Beginner's Guide, Part 1", 'Item Slug': 'packt-it-fundamentals', 'Partner Name': 'Packt', Duration: '9' }),
    row({ 'Collection ID': 'JpPZG', 'Collection Name': 'CompTIA A+ Professional Certificate (CompTIA A+)', 'Item Type': 'SPECIALIZATION', 'Item ID': 'Lo83mZYpQSSAeqARK-fzKA', 'Item Name': 'A bundle', 'Item Slug': 'bundle', 'Partner Name': 'Packt' }),
  ].join('\n');

  const parsed = parseCuratedCollectionsCsv(csv, { fileName: FILE_NAME, sha256: 'abc' });
  assert.equal(parsed.programId, 'TpIlAogTQ8-SJQKIE8PP9w');
  assert.equal(parsed.exportedAt, '2026-09-17T22:05:40.249Z');
  assert.equal(parsed.courseRows, 3);
  assert.equal(parsed.skippedRows, 1);
  assert.deepEqual(parsed.collections.map((collection) => collection.collectionId), ['JpPZG', '0lodU']);
  assert.deepEqual(parsed.collections[0].courses.map((course) => course.courseId), ['7sBiclFIEeetjQ5ppGVTyA', 'ySI6pmchEe--dw7PPVphLw']);
  assert.deepEqual(parsed.collections[0].courses[0].specializationIds, ['8DhEU2gRRQShooqlqIcKrQ', 'UszQQ61wEe2O-BL57hX6Tw']);
  assert.equal(parsed.collections[0].courses[0].durationHours, 13);
  assert.equal(parsed.collections[1].courses[0].durationHours, null);
  assert.equal(parsed.collections[1].courses[0].name, 'Introduction to Technical Support', 'names are trimmed');
});

test('refuses exports that would corrupt attribution', () => {
  const good = row({ 'Collection ID': 'JpPZG', 'Collection Name': 'A+', 'Item Type': 'COURSE', 'Item ID': '7sBiclFIEeetjQ5ppGVTyA', 'Item Name': 'x', 'Item Slug': 'x', 'Partner Name': 'p' });
  assert.throws(
    () => parseCuratedCollectionsCsv(['Collection ID,Item Type', 'a,COURSE'].join('\n'), { fileName: FILE_NAME, sha256: 'x' }),
    /missing column/,
  );
  assert.throws(
    () => parseCuratedCollectionsCsv([HEADER, good, row({ 'Collection ID': 'JpPZG', 'Collection Name': 'Renamed', 'Item Type': 'COURSE', 'Item ID': 'ySI6pmchEe--dw7PPVphLw', 'Item Name': 'y', 'Item Slug': 'y', 'Partner Name': 'p' })].join('\n'), { fileName: FILE_NAME, sha256: 'x' }),
    /named "Renamed" here but "A\+" earlier/,
  );
  assert.throws(
    () => parseCuratedCollectionsCsv([HEADER, good, good].join('\n'), { fileName: FILE_NAME, sha256: 'x' }),
    /listed twice/,
  );
  assert.throws(
    () => parseCuratedCollectionsCsv([HEADER, row({ 'Collection ID': 'JpPZG', 'Collection Name': 'A+', 'Item Type': 'COURSE', 'Item ID': 'short', 'Item Name': 'x', 'Item Slug': 'x', 'Partner Name': 'p' })].join('\n'), { fileName: FILE_NAME, sha256: 'x' }),
    /not a 22-character/,
  );
});

test('serializes a deterministic TypeScript module with escaped strings and provenance', () => {
  const csv = [
    HEADER,
    row({ 'Collection ID': 'JpPZG', 'Collection Name': 'CompTIA A+ Professional Certificate (CompTIA A+)', 'Item Type': 'COURSE', 'Item ID': 'ySI6pmchEe--dw7PPVphLw', 'Item Name': "The Absolute Beginner's Guide", 'Item Slug': 'packt-it-fundamentals', 'Partner Name': 'Packt', Duration: '9' }),
  ].join('\n');
  const parsed = parseCuratedCollectionsCsv(csv, { fileName: FILE_NAME, sha256: 'deadbeef' });
  const source = serializeCuratedCollectionsModule(parsed);
  assert.equal(source, serializeCuratedCollectionsModule(parsed), 'deterministic');
  assert.match(source, /^\/\/ GENERATED by scripts\/coursera\/generate-curated-collections\.ts/);
  assert.match(source, /sha256 deadbeef/);
  assert.match(source, /exportedAt: '2026-09-17T22:05:40\.249Z'/);
  assert.match(source, /name: 'The Absolute Beginner\\'s Guide'/);
  assert.match(source, /durationHours: 9, specializationIds: \[\] \}/);
  assert.ok(source.endsWith(']);\n'));
});
