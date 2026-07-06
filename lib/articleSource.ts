import { Article } from './types';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';

// TODO: WordPress REST API adapter — replace loadArticles() with live WP fetch when ready
// import { fetchWordPressArticles } from './adapters/wordpressAdapter';

const ARTICLES_PATH = path.join(process.cwd(), 'public', 'data', 'sample-articles.json');

let _cached: Article[] | null = null;

export function loadArticles(): Article[] {
  if (_cached) return _cached;

  try {
    const raw = fs.readFileSync(ARTICLES_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Article[];
    _cached = parsed.map((a) => ({
      ...a,
      sourceMode: 'static-demo-cache' as const,
      sourceLabel: 'Recent fallback cache',
    }));
    return _cached;
  } catch {
    console.error('[articleSource] Failed to load sample-articles.json');
    return [];
  }
}

/**
 * A "real" clickable article page — used to decide whether an article may be
 * rendered as a clickable Main Article / Related Coverage card. Fallback demo
 * cache articles (example.com) and anything that isn't a real indianexpress.com
 * article path (e.g. the bare homepage) fail this check; they may still inform
 * Quick Pulse / Key Developments text, just never a clickable card.
 */
export function isValidArticleUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname !== 'indianexpress.com' && u.hostname !== 'www.indianexpress.com') return false;
    const path = u.pathname.replace(/\/+$/, '');
    if (!path || path === '') return false;
    if (url.includes('example.com')) return false;
    return true;
  } catch {
    return false;
  }
}

export function getArticleById(id: string): Article | undefined {
  return loadArticles().find((a) => a.id === id);
}

export function getArticleSourceStatus(): { ok: boolean; count: number; path: string } {
  const articles = loadArticles();
  return {
    ok: articles.length > 0,
    count: articles.length,
    path: ARTICLES_PATH,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Live RSS feed source (Indian Express) — server-side only.
// Google NLP is never a source here; it only enriches article text/entities
// after articles have already been fetched (see lib/googleNlp.ts).
// ─────────────────────────────────────────────────────────────────────────

const FEED_SOURCES: Array<{ url: string; category: string }> = [
  { url: 'https://indianexpress.com/feed/', category: 'Top News' },
  { url: 'https://indianexpress.com/section/india/feed/', category: 'India' },
  { url: 'https://indianexpress.com/section/business/feed/', category: 'Business' },
  { url: 'https://indianexpress.com/section/cities/feed/', category: 'Cities' },
  { url: 'https://indianexpress.com/section/political-pulse/feed/', category: 'Politics' },
  { url: 'https://indianexpress.com/section/explained/feed/', category: 'Explained' },
  { url: 'https://indianexpress.com/section/technology/feed/', category: 'Technology' },
  { url: 'https://indianexpress.com/section/sports/feed/', category: 'Sports' },
  { url: 'https://indianexpress.com/section/entertainment/feed/', category: 'Entertainment' },
  { url: 'https://indianexpress.com/section/lifestyle/feed/', category: 'Lifestyle' },
];

const RSS_TIMEOUT_MS = 8000;
const MIN_LIVE_ARTICLES = 10;
const MAX_LIVE_ARTICLES = 150;
const LIVE_CACHE_TTL_MS = 5 * 60 * 1000;

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&#(\d+);/g, (_m, code: string) => {
      try {
        return String.fromCharCode(parseInt(code, 10));
      } catch {
        return '';
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTag(itemXml: string, tag: string): string {
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = itemXml.match(re);
  if (!m) return '';
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) val = cdata[1];
  return val.trim();
}

function extractAllTags(itemXml: string, tag: string): string[] {
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(itemXml)) !== null) {
    let val = m[1].trim();
    const cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    if (cdata) val = cdata[1];
    val = val.trim();
    if (val) out.push(val);
  }
  return out;
}

function extractAttrUrl(itemXml: string, tag: string): string {
  const re = new RegExp('<' + tag + '[^>]*\\surl=["\']([^"\']+)["\']', 'i');
  const m = itemXml.match(re);
  return m ? m[1] : '';
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

function normalizeItem(itemXml: string, sectionCategory: string): Article | null {
  const title = decodeEntities(stripHtml(extractTag(itemXml, 'title')));
  const link = extractTag(itemXml, 'link').trim();
  if (!title || !link) return null;

  const description = extractTag(itemXml, 'description');
  const contentEncoded = extractTag(itemXml, 'content:encoded');

  const excerpt = decodeEntities(stripHtml(description)).slice(0, 400);
  const content = contentEncoded
    ? decodeEntities(stripHtml(contentEncoded)).slice(0, 4000)
    : excerpt;

  const pubDateRaw = extractTag(itemXml, 'pubDate');
  let publishedAt: string;
  try {
    const parsed = pubDateRaw ? new Date(pubDateRaw) : new Date();
    publishedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } catch {
    publishedAt = new Date().toISOString();
  }

  const categories = extractAllTags(itemXml, 'category').map((c) => decodeEntities(stripHtml(c)));
  const category = categories[0] || sectionCategory || 'General';
  const tags = categories.length ? categories : sectionCategory ? [sectionCategory] : [];

  const guid = extractTag(itemXml, 'guid') || link;
  const author = decodeEntities(stripHtml(extractTag(itemXml, 'dc:creator'))) || 'The Indian Express';
  const imageUrl = extractAttrUrl(itemXml, 'enclosure') || extractAttrUrl(itemXml, 'media:content') || '';

  const id = 'rss-' + createHash('md5').update(guid).digest('hex').slice(0, 12);

  return {
    id,
    title,
    url: link,
    excerpt,
    content,
    category,
    tags,
    publishedAt,
    author,
    source: 'The Indian Express',
    imageUrl,
    sourceMode: 'live-rss-feed',
    sourceLabel: 'Live RSS feed',
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TopicPulseBot/1.0 (+https://indianexpress.com)' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveArticles(): Promise<Article[]> {
  const results = await Promise.allSettled(
    FEED_SOURCES.map(async (feed) => {
      const xml = await fetchWithTimeout(feed.url, RSS_TIMEOUT_MS);
      return extractItems(xml)
        .map((itemXml) => normalizeItem(itemXml, feed.category))
        .filter((a): a is Article => a !== null);
    }),
  );

  const all: Article[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      all.push(...r.value);
    } else {
      console.warn('[articleSource] RSS feed fetch failed:', r.reason);
    }
  }

  const byUrl = new Map<string, Article>();
  for (const a of all) {
    if (!byUrl.has(a.url)) byUrl.set(a.url, a);
  }

  return Array.from(byUrl.values())
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_LIVE_ARTICLES);
}

let _liveCache: { articles: Article[]; fetchedAt: number } | null = null;

/** Returns live RSS articles, or null if the live feed failed / returned too few articles. */
export async function getLiveArticles(): Promise<Article[] | null> {
  if (_liveCache && Date.now() - _liveCache.fetchedAt < LIVE_CACHE_TTL_MS) {
    return _liveCache.articles;
  }

  try {
    const articles = await fetchLiveArticles();
    if (articles.length >= MIN_LIVE_ARTICLES) {
      _liveCache = { articles, fetchedAt: Date.now() };
      return articles;
    }
    console.warn(
      `[articleSource] Live RSS returned only ${articles.length} article(s) (min ${MIN_LIVE_ARTICLES}); falling back to demo cache`,
    );
    return null;
  } catch (err) {
    console.error('[articleSource] Live RSS fetch failed:', err);
    return null;
  }
}

function normalizeUrlKey(url: string): string {
  return (url || '').trim().toLowerCase().replace(/\/+$/, '');
}

function dedupeArticles(articles: Article[]): Article[] {
  const byKey = new Map<string, Article>();
  for (const a of articles) {
    const key = normalizeUrlKey(a.url) || a.title.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, a);
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/**
 * Hybrid source resolution: live RSS merged with the static demo cache whenever
 * live succeeds (guarantees topic clusters the live feed may be missing that day
 * — e.g. "elections" — still have coverage), pure fallback cache otherwise.
 * Google NLP is never a source here, only an enrichment step applied afterward.
 */
export async function getArticlesWithSourceMode(): Promise<{
  articles: Article[];
  sourceMode: 'live-rss-feed' | 'static-demo-cache' | 'hybrid-live-rss-cache';
  liveCount: number;
  fallbackCount: number;
}> {
  const live = await getLiveArticles();
  const fallback = loadArticles();

  if (live && live.length > 0) {
    return {
      articles: dedupeArticles([...live, ...fallback]),
      sourceMode: 'hybrid-live-rss-cache',
      liveCount: live.length,
      fallbackCount: fallback.length,
    };
  }

  return {
    articles: fallback,
    sourceMode: 'static-demo-cache',
    liveCount: 0,
    fallbackCount: fallback.length,
  };
}
