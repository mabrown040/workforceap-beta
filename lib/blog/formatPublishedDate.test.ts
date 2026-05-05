import assert from 'node:assert/strict';
import { formatPublishedDate } from '@/lib/blog/formatPublishedDate';

assert.equal(
  formatPublishedDate('2026-05-01T00:30:00.000Z'),
  '5/1/2026',
  'UTC formatter should keep the publish day stable',
);

assert.equal(
  formatPublishedDate(new Date('2026-12-31T23:59:59.000Z')),
  '12/31/2026',
  'Date inputs should format consistently',
);

console.log('formatPublishedDate tests passed');
