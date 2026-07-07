import { NextRequest, NextResponse } from 'next/server';
import { saveRegistration } from '@/lib/registrationStore';
import { RegistrationPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  let body: Partial<RegistrationPayload> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.name || !body.email || !body.mobile) {
    return NextResponse.json(
      { error: 'Fields "name", "email", and "mobile" are required.' },
      { status: 400 },
    );
  }

  const payload: RegistrationPayload = {
    name: body.name,
    email: body.email,
    mobile: body.mobile,
    query: body.query || '',
    topic: body.topic || '',
    timestamp: new Date().toISOString(),
  };

  const saved = await saveRegistration(payload);

  return NextResponse.json({ saved, timestamp: payload.timestamp });
}
