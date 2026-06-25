/**
 * Cache store for enriched topic data.
 * In production, replace file-based cache with Supabase or Vercel KV.
 * The Vercel filesystem is read-only at runtime; writes only work during build
 * or in local development. Use the /api/topic-pulse/refresh route to regenerate.
 */
import { TopicCache, EnrichedArticle } from './types';
import { loadArticles } from './articleSource';
import path from 'path';
import fs from 'fs';

const CACHE_PATH = path.join(process.cwd(), 'public', 'data', 'topic-pulse-cache.json');

let _memoryCache: TopicCache | null = null;

export function readCache(): TopicCache | null {
  if (_memoryCache) return _memoryCache;

  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
      _memoryCache = JSON.parse(raw) as TopicCache;
      return _memoryCache;
    }
  } catch {
    console.warn('[cacheStore] Could not read cache file, falling back to raw articles');
  }
  return null;
}

export function getArticlesFromCache(): EnrichedArticle[] {
  const cache = readCache();
  if (cache && cache.articles.length > 0) return cache.articles;
  // Fallback: treat raw articles as enriched (no NLP entities)
  return loadArticles() as EnrichedArticle[];
}

export function writeCache(cache: TopicCache): boolean {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    _memoryCache = cache;
    return true;
  } catch {
    // Vercel read-only filesystem — cache write will fail silently in production
    console.warn('[cacheStore] Cache write failed (expected on Vercel read-only FS)');
    return false;
  }
}

export function getCacheStatus(): { ok: boolean; builtAt: string | null; articleCount: number } {
  const cache = readCache();
  return {
    ok: !!cache,
    builtAt: cache?.builtAt ?? null,
    articleCount: cache?.articleCount ?? 0,
  };
}

export function invalidateMemoryCache(): void {
  _memoryCache = null;
}
