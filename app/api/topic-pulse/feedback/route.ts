import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback } from '@/lib/feedbackStore';
import { FeedbackPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  let body: Partial<FeedbackPayload> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.query || typeof body.useful !== 'boolean') {
    return NextResponse.json(
      { error: 'Fields "query" and "useful" (boolean) are required.' },
      { status: 400 },
    );
  }

  const payload: FeedbackPayload = {
    query: body.query,
    topic: body.topic || '',
    useful: body.useful,
    comment: body.comment,
    sourcesUsed: body.sourcesUsed,
    timestamp: new Date().toISOString(),
  };

  await saveFeedback(payload);

  return NextResponse.json({ saved: true, timestamp: payload.timestamp });
}
