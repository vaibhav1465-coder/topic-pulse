import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeTopic,
  findArticlesWithFallback,
  getClusterRule,
  getClusterById,
  getMatchedClusterArticles,
  MAX_PULSE_ARTICLES,
} from '@/lib/topicEngine';
import { buildAnswer } from '@/lib/answerBuilder';
import { getArticlesWithSourceMode, isValidArticleUrl } from '@/lib/articleSource';
import { enrichArticlesWithGoogleNlp } from '@/lib/googleNlp';

async function handleQuery(query: string, clusterId?: string) {
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
  }

  const topic = normalizeTopic(query.trim());

  // Hybrid pool: live RSS merged with the fallback cache whenever live succeeds,
  // so a cluster the live feed happens to be missing today (e.g. elections)
  // still has coverage. Google NLP only enriches text here — never a source.
  const { articles } = await getArticlesWithSourceMode();
  const enrichedArticles = await enrichArticlesWithGoogleNlp(articles);

  // When the widget clicks a Today's Pulse card it passes back the same
  // clusterId that pulse was built with — reuse the exact same match logic
  // (not the scored free-text matcher) so the result screen's article count
  // can never disagree with the pulse card's stated count.
  const clusterDef = clusterId ? getClusterById(clusterId) : null;

  const matchResult = clusterDef
    ? {
        articles: getMatchedClusterArticles(enrichedArticles, clusterDef).slice(0, MAX_PULSE_ARTICLES),
        confidence: 'high' as const,
        topic: clusterDef.label,
        matchTier: 'exact' as const,
      }
    : findArticlesWithFallback(enrichedArticles, topic);

  const answer = buildAnswer(matchResult);

  const rule = clusterDef || getClusterRule(topic);
  const validCount = matchResult.articles.filter((a) => isValidArticleUrl(a.url)).length;
  const clusterValidation = {
    passed: validCount > 0,
    rule: rule ? rule.groups.map((g) => g.join(' OR ')).join(' AND ') : 'generic keyword match',
    rejectedReason: validCount > 0 ? null : 'No strongly related live articles found for this specific topic yet.',
  };

  return NextResponse.json({ ...answer, clusterValidation });
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query') || '';
  const clusterId = req.nextUrl.searchParams.get('clusterId') || undefined;
  return handleQuery(query, clusterId);
}

export async function POST(req: NextRequest) {
  let body: { query?: string; clusterId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  return handleQuery(body.query || '', body.clusterId);
}
