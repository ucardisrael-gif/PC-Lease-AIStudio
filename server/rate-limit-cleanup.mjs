// Do not discard active timestamps: that would reset the corresponding limit.
export function pruneRateLimitBuckets(buckets, now = Date.now(), windowMs = 60000) {
  for (const [key, timestamps] of buckets) {
    const active = timestamps.filter(timestamp => now - timestamp < windowMs);
    if (active.length) buckets.set(key, active);
    else buckets.delete(key);
  }
}
