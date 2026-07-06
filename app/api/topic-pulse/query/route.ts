import { NextRequest, NextResponse } from 'next/server';
import { normalizeTopic, findArticlesWithFallback, getClusterRule } from '@/lib/topicEngine';
import { buildAnswer } from '@/lib/answerBuilder';
import { getArticlesWithSourceMode, isValidArticleUrl } from '@/lib/articleSource';
import { enrichArticlesWithGoogleNlp } from '@/lib/googleNlp';

async function handleQuery(query: string) {
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
  }

  const topic = normalizeTopic(query.trim());

  // Hybrid pool: live RSS merged with the fallback cache whenever live succeeds,
  // so a cluster the live feed happens to be missing today (e.g. elections)
  // still has coverage. Google NLP only enriches text here — never a source.
  const { articles } = await getArticlesWithSourceMode();
  const enrichedArticles = await enrichArticlesWithGoogleNlp(articles);

  // Same strict-cluster gate used by Today's Pulses when the query matches a
  // curated cluster (e.g. "Delhi heatwave"); otherwise the normal single-group
  // topic-signal match. Never widens the gate to admit unrelated articles.
  const matchResult = findArticlesWithFallback(enrichedArticles, topic);
  const answer = buildAnswer(matchResult);

  const rule = getClusterRule(topic);
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
  return handleQuery(query);
}

export async function POST(req: NextRequest) {
  let body: { query?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  return handleQuery(body.query || '');
}
