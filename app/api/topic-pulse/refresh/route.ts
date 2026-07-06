import { NextResponse } from 'next/server';
import { getArticlesWithSourceMode } from '@/lib/articleSource';
import { enrichArticlesWithGoogleNlp, getNlpStatus } from '@/lib/googleNlp';
import { writeCache, invalidateMemoryCache } from '@/lib/cacheStore';
import { TopicCache } from '@/lib/types';

export async function POST() {
  const { articles, sourceMode, liveCount, fallbackCount } = await getArticlesWithSourceMode();
  const nlpStatus = getNlpStatus();

  // Google NLP only enriches text already fetched above — never a source itself.
  const enriched = await enrichArticlesWithGoogleNlp(articles);

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
    sourceMode,
    sourceBreakdown: {
      liveRss: liveCount,
      googleNlp: nlpStatus.enabled,
      fallbackCache: fallbackCount,
      wordpressRestApi: false,
    },
    nlpStatus: {
      enabled: nlpStatus.enabled,
      reason: nlpStatus.reason,
    },
    cacheUpdatedAt: cache.builtAt,
    cacheWritten: written,
  });
}
