import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCatalogCoverageReport,
  catalogCoverageIssueLabel,
} from './catalogCoverage';

test('catalog coverage report covers every registered Learning Path', () => {
  const report = buildCatalogCoverageReport();
  assert.equal(report.summary.pathCount, 16);
  assert.ok(report.summary.pathsWithIssues > 0, 'known catalog gaps should surface as issues');
  assert.ok(
    report.summary.missingLearningPathIds >= 1,
    'tEMYo (IT Support + Entry-Level Cyber) still lacks a Learning Path id',
  );
  assert.ok(
    report.summary.missingDiscoveredCatalog >= 1,
    'tEMYo program still has no discovered catalog entry',
  );
});

test('IT Support + Entry-Level Cyber path is flagged for missing path id and catalog', () => {
  const report = buildCatalogCoverageReport();
  const row = report.rows.find((entry) => entry.collectionId === 'tEMYo');
  assert.ok(row);
  assert.equal(row.programSlug, 'it-support-and-entry-level-cyber-security-certificate');
  assert.equal(row.learningPathId, null);
  assert.equal(row.discoveredCourseCount, null);
  assert.ok(row.curatedCourseCount > 0);
  assert.ok(row.issues.includes('missing_learning_path_id'));
  assert.ok(row.issues.includes('missing_discovered_catalog'));
});

test('combined Net+/Sec+ collection reports curated-vs-discovered course drift when present', () => {
  const report = buildCatalogCoverageReport();
  const row = report.rows.find((entry) => entry.collectionId === '81uci');
  assert.ok(row);
  assert.equal(row.programSlug, 'cybersecurity-professional-certificate-google');
  assert.notEqual(row.discoveredCourseCount, null);
  // Curated collection holds Google cyber + networking courses; discovered
  // catalog currently carries only the Google cyber subset for this slug.
  assert.ok(
    row.curatedCourseCount >= (row.discoveredCourseCount ?? 0),
    'curated Net+/Sec+ list should be at least as large as the discovered entry',
  );
  if (row.curatedCourseCount > (row.discoveredCourseCount ?? 0)) {
    assert.ok(row.issues.includes('discovered_missing_curated_courses'));
    assert.ok(row.curatedOnlyCourseIds.length > 0);
  }
});

test('catalogCoverageIssueLabel covers every issue kind', () => {
  assert.match(catalogCoverageIssueLabel('missing_learning_path_id'), /Learning Path id/i);
  assert.match(catalogCoverageIssueLabel('missing_discovered_catalog'), /discovered catalog/i);
  assert.match(catalogCoverageIssueLabel('discovered_missing_curated_courses'), /missing curated/i);
  assert.match(catalogCoverageIssueLabel('discovered_extra_courses'), /extra courses/i);
  assert.match(catalogCoverageIssueLabel('unverified_path'), /Unverified/i);
});
