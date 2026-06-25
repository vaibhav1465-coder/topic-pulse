import { NextResponse } from 'next/server';
import { loadArticles } from '@/lib/articleSource';
import { extractEntities, getNlpStatus } from '@/lib/googleNlp';
import { writeCache, invalidateMemoryCache } from '@/lib/cacheStore';
import { EnrichedArticle, TopicCache } from '@/lib/types';

export async function POST() {
  const articles = loadArticles();
  const nlpStatus = getNlpStatus();

  const enriched: EnrichedArticle[] = [];

  for (const article of articles) {
    if (nlpStatus.enabled) {
      const text = `${article.title}. ${article.excerpt}`;
      const entities = await extractEntities(text);
      enriched.push({ ...article, nlpEntities: entities });
    } else {
      enriched.push({ ...article });
    }
  }

  const allTopics = [
    ...new Set(enriched.flatMap((a) => a.tags).map((t) => t.toLowerCase())),
  ].sort();

  const cache: TopicCache = {
    builtAt: new Date().toISOString(),
    articleCount: enriched.length,
    articles: enriched,
    topics: allTopics,
    nlpEnabled: nlpStatus.enabled,
  };

  invalidateMemoryCache();
  const written = writeCache(cache);

  return NextResponse.json({
    refreshed: true,
    articleCount: enriched.length,
    clusterCount: allTopics.length,
    nlpStatus: {
      enabled: nlpStatus.enabled,
      reason: nlpStatus.reason,
    },
    cacheUpdatedAt: cache.builtAt,
    cacheWritten: written,
  });
}
