import { NlpEntity } from './types';

interface NlpStatus {
  enabled: boolean;
  reason?: string;
  source: string;
}

function getNlpStatus(): NlpStatus {
  const base: NlpStatus = { enabled: false, source: 'google-cloud-natural-language' };

  if (process.env.GOOGLE_NLP_ENABLED !== 'true') {
    return { ...base, reason: 'GOOGLE_NLP_ENABLED is not set to true' };
  }

  const hasCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

  if (!hasCreds) {
    return { ...base, reason: 'No Google credentials configured' };
  }

  return { enabled: true, source: 'google-cloud-natural-language' };
}

function buildGoogleClient() {
  // Supports Vercel deployment via base64-encoded service account JSON
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      return { credentials: json };
    } catch {
      console.error('[googleNlp] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
    }
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS file path
  return {};
}

export async function extractEntities(text: string): Promise<NlpEntity[]> {
  const status = getNlpStatus();
  if (!status.enabled) return [];

  try {
    // Dynamic import to avoid crashing when package is unavailable
    const { LanguageServiceClient } = await import('@google-cloud/language');
    const options = buildGoogleClient();
    const client = new LanguageServiceClient(options);

    const [result] = await client.analyzeEntities({
      document: { content: text, type: 'PLAIN_TEXT' as const },
    });

    return (result.entities || []).map((e) => ({
      name: e.name || '',
      type: e.type?.toString() || 'UNKNOWN',
      salience: e.salience || 0,
    }));
  } catch (err) {
    console.error('[googleNlp] Entity extraction failed:', err);
    return [];
  }
}

export { getNlpStatus };
