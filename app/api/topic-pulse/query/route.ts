import { NextRequest, NextResponse } from 'next/server';
import { normalizeTopic, findArticlesForTopic } from '@/lib/topicEngine';
import { buildAnswer } from '@/lib/answerBuilder';
import { getArticlesFromCache } from '@/lib/cacheStore';

async function handleQuery(query: string) {
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
  }

  const topic = normalizeTopic(query.trim());
  const articles = getArticlesFromCache();
  const matchResult = findArticlesForTopic(articles, topic);
  const answer = buildAnswer(matchResult);

  return NextResponse.json(answer);
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
