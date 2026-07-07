import { NextResponse } from 'next/server';
import { getArticlesWithSourceMode } from '@/lib/articleSource';
import { buildStrictClusters } from '@/lib/topicEngine';
import { getNlpStatus } from '@/lib/googleNlp';

// Depends on a live RSS fetch — must run per-request, not be frozen at build time.
export const dynamic = 'force-dynamic';

// "Article source" wording — never names Google Trends/search-interest here,
// since those are trend-ranking signals, not where article cards come from.
const SOURCE_LABELS: Record<string, string> = {
  'live-rss-feed': 'Live articles',
  'static-demo-cache': 'Recent cache',
  'hybrid-live-rss-cache': 'Live articles + recent cache',
};

export async function GET() {
  try {
    // Hybrid pool (live + fallback merged when live succeeds) so every normal
    // cluster — including ones the live feed is thin on that day — still shows up.
    const { articles, sourceMode, liveCount, fallbackCount } = await getArticlesWithSourceMode();
    const sourceLabel = SOURCE_LABELS[sourceMode] || sourceMode;

    // Topic signal is reported separately from article source — it never
    // implies Google Trends/search-interest fetched the articles themselves.
    const nlpStatus = getNlpStatus();
    const topicSignalParts: string[] = [];
    if (nlpStatus.enabled) topicSignalParts.push('Google NLP');
    const topicSignalLabel = topicSignalParts.length ? topicSignalParts.join(' + ') : null;

    // Clusters are built directly from strict, evidence-gated rules — a cluster
    // only appears if it has ≥4 strongly related, real-URL articles. No hardcoded
    // labels, no unrelated filler, no cluster shown on a hunch.
    const pulses = buildStrictClusters(articles).map((cluster) => ({
      ...cluster,
      sourceLabel,
      topicSignalLabel,
      articleUrls: cluster.articles.map((a) => a.url),
      // Trim the embedded article payload to what the widget/debug view needs.
      articles: cluster.articles.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        excerpt: a.excerpt,
        publishedAt: a.publishedAt,
        source: a.source,
      })),
    }));

    return NextResponse.json({
      pulses,
      sourceMode,
      sourceLabel,
      topicSignalLabel,
      sourceBreakdown: { liveRss: liveCount, fallbackCache: fallbackCount },
      lastUpdated: new Date().toISOString(),
      articleCount: articles.length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate pulses' }, { status: 500 });
  }
}
