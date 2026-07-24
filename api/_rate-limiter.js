// Simple in-memory rate limiter helper for Vercel serverless functions
const cache = new Map();

export function rateLimit(ip, limit = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  if (!cache.has(ip)) {
    cache.set(ip, []);
  }
  
  let timestamps = cache.get(ip);
  // Filter out timestamps outside the sliding window
  timestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
  
  if (timestamps.length >= limit) {
    const timePassedSinceFirst = now - timestamps[0];
    const retryAfter = Math.max(1, Math.round((windowMs - timePassedSinceFirst) / 1000));
    return { blocked: true, retryAfter };
  }
  
  timestamps.push(now);
  cache.set(ip, timestamps);
  
  // Periodically clean up stale entries from the cache (memory leak protection)
  if (cache.size > 1000) {
    const keysToDelete = [];
    for (const [key, val] of cache.entries()) {
      const filtered = val.filter(t => now - t < windowMs);
      if (filtered.length === 0) {
        keysToDelete.push(key);
      } else {
        cache.set(key, filtered);
      }
    }
    keysToDelete.forEach(k => cache.delete(k));
  }
  
  return { blocked: false };
}
