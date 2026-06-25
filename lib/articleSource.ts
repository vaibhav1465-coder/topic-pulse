import { Article } from './types';
import path from 'path';
import fs from 'fs';

// TODO: WordPress REST API adapter — replace loadArticles() with live WP fetch when ready
// import { fetchWordPressArticles } from './adapters/wordpressAdapter';

const ARTICLES_PATH = path.join(process.cwd(), 'public', 'data', 'sample-articles.json');

let _cached: Article[] | null = null;

export function loadArticles(): Article[] {
  if (_cached) return _cached;

  try {
    const raw = fs.readFileSync(ARTICLES_PATH, 'utf-8');
    _cached = JSON.parse(raw) as Article[];
    return _cached;
  } catch {
    console.error('[articleSource] Failed to load sample-articles.json');
    return [];
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
