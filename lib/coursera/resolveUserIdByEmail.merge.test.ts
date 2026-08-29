import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeCourseraEmailResolutions } from './mergeCourseraEmailResolutions';

describe('mergeCourseraEmailResolutions', () => {
  it('fails closed when direct portal email and identity mapping disagree', () => {
    const map = mergeCourseraEmailResolutions({
      directHits: [{ email: 'Same@Org.com', userId: 'portal-user' }],
      mappingHits: [{ email: 'same@org.com', userId: 'mapped-other' }],
    });
    assert.equal(map.has('same@org.com'), false);
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
