import { NextResponse } from 'next/server';
import { getDynamicPulses } from '@/lib/trendingTopics';
import { loadArticles } from '@/lib/articleSource';

export async function GET() {
  try {
    const pulses = getDynamicPulses();
    const articles = loadArticles();

    return NextResponse.json({
      pulses,
      sourceMode: 'static-demo-cache',
      lastUpdated: new Date().toISOString(),
      articleCount: articles.length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate pulses' }, { status: 500 });
  }
}
