import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeCourseraEmailResolutions } from './mergeCourseraEmailResolutions';

describe('mergeCourseraEmailResolutions', () => {
  it('lets direct portal email win over identity mapping', () => {
    const map = mergeCourseraEmailResolutions({
      directHits: [{ email: 'Same@Org.com', userId: 'portal-user' }],
      mappingHits: [{ email: 'same@org.com', userId: 'mapped-other' }],
    });
    assert.equal(map.get('same@org.com'), 'portal-user');
  });

  it('fills alt Coursera emails from identity mappings', () => {
    const map = mergeCourseraEmailResolutions({
      directHits: [{ email: 'portal@wap.org', userId: 'u1' }],
      mappingHits: [{ email: 'learner@gmail.com', userId: 'u1' }],
    });
    assert.equal(map.get('portal@wap.org'), 'u1');
    assert.equal(map.get('learner@gmail.com'), 'u1');
  });

  it('ignores blank emails', () => {
    const map = mergeCourseraEmailResolutions({
      directHits: [{ email: '  ', userId: 'u1' }],
      mappingHits: [{ email: '', userId: 'u2' }],
    });
    assert.equal(map.size, 0);
  });
});
