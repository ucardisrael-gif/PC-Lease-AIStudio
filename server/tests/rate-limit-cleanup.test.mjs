import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruneRateLimitBuckets } from '../rate-limit-cleanup.mjs';

test('cleanup removes expired buckets without resetting active limits', () => {
  const buckets = new Map([
    ['expired', [0, 1000]],
    ['mixed', [1000, 61000, 61999]],
    ['active', Array(10).fill(61999)],
  ]);
  pruneRateLimitBuckets(buckets, 62000, 60000);
  assert.equal(buckets.has('expired'), false);
  assert.deepEqual(buckets.get('mixed'), [61000, 61999]);
  assert.equal(buckets.get('active').length, 10);
  pruneRateLimitBuckets(buckets, 122000, 60000);
  assert.equal(buckets.size, 0);
});
