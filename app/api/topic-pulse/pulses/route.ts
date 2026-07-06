import { NextResponse } from 'next/server';
import { getArticlesWithSourceMode } from '@/lib/articleSource';
import { buildStrictClusters } from '@/lib/topicEngine';

// Depends on a live RSS fetch — must run per-request, not be frozen at build time.
export const dynamic = 'force-dynamic';

const SOURCE_LABELS: Record<string, string> = {
  'live-rss-feed': 'Live RSS feed',
  'static-demo-cache': 'Recent fallback cache',
  'hybrid-live-rss-cache': 'Live RSS + Recent cache',
};

export async function GET() {
  try {
    // Hybrid pool (live + fallback merged when live succeeds) so every normal
    // cluster — including ones the live feed is thin on that day — still shows up.
    const { articles, sourceMode, liveCount, fallbackCount } = await getArticlesWithSourceMode();
    const sourceLabel = SOURCE_LABELS[sourceMode] || sourceMode;

    // Clusters are built directly from strict, evidence-gated rules — a cluster
    // only appears if it has ≥4 strongly related, real-URL articles. No hardcoded
    // labels, no unrelated filler, no cluster shown on a hunch.
    const pulses = buildStrictClusters(articles).map((cluster) => ({
      ...cluster,
      sourceLabel,
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
      sourceBreakdown: { liveRss: liveCount, fallbackCache: fallbackCount },
      lastUpdated: new Date().toISOString(),
      articleCount: articles.length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate pulses' }, { status: 500 });
  }
}
