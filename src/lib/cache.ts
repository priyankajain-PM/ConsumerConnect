import { LRUCache } from "lru-cache";

// In-memory LRU cache for freebusy results.
// Sufficient for 30 concurrent users — no Redis needed.
const freebusyCache = new LRUCache<string, { busy: Array<{ start: string; end: string }> }>({
  max: 500,           // max 500 PM/date combinations cached
  ttl: 1000 * 60 * 5, // 5-minute TTL
});

export function getFreebusyCache(pmId: string, dateStr: string) {
  return freebusyCache.get(`${pmId}:${dateStr}`);
}

export function setFreebusyCache(
  pmId: string,
  dateStr: string,
  busy: Array<{ start: string; end: string }>
) {
  freebusyCache.set(`${pmId}:${dateStr}`, { busy });
}

export function invalidateFreebusyCache(pmId: string, dateStr: string) {
  freebusyCache.delete(`${pmId}:${dateStr}`);
}
