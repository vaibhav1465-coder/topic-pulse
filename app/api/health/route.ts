import { NextResponse } from 'next/server';
import { getArticleSourceStatus } from '@/lib/articleSource';
import { getCacheStatus } from '@/lib/cacheStore';
import { getNlpStatus } from '@/lib/googleNlp';

export async function GET() {
  const articleStatus = getArticleSourceStatus();
  const cacheStatus = getCacheStatus();
  const nlpStatus = getNlpStatus();

  return NextResponse.json({
    status: 'ok',
    app: 'Topic Pulse',
    version: process.env.TOPIC_PULSE_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    nlp: {
      enabled: nlpStatus.enabled,
      reason: nlpStatus.reason,
      source: nlpStatus.source,
    },
    articleSource: {
      ok: articleStatus.ok,
      count: articleStatus.count,
    },
    cache: {
      ok: cacheStatus.ok,
      builtAt: cacheStatus.builtAt,
      articleCount: cacheStatus.articleCount,
    },
  });
}
