import { Article, EnrichedArticle, NlpEntity } from './types';

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

  const hasApiKey = !!process.env.GOOGLE_NLP_API_KEY;
  const hasCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

  if (!hasApiKey && !hasCreds) {
    return { ...base, reason: 'No GOOGLE_NLP_API_KEY or Google credentials configured' };
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

// Simple REST call using GOOGLE_NLP_API_KEY — no service-account setup required.
async function extractEntitiesViaApiKey(text: string): Promise<NlpEntity[]> {
  const apiKey = process.env.GOOGLE_NLP_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://language.googleapis.com/v1/documents:analyzeEntities?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: { type: 'PLAIN_TEXT', content: text },
          encodingType: 'UTF8',
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) throw new Error(`Google NLP API error ${res.status}`);
    const data = await res.json();

    return ((data.entities || []) as Array<{ name?: string; type?: string; salience?: number }>).map(
      (e) => ({
        name: e.name || '',
        type: e.type || 'UNKNOWN',
        salience: e.salience || 0,
      }),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function extractEntitiesViaClientLibrary(text: string): Promise<NlpEntity[]> {
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
}

export async function extractEntities(text: string): Promise<NlpEntity[]> {
  const status = getNlpStatus();
  if (!status.enabled) return [];

  try {
    if (process.env.GOOGLE_NLP_API_KEY) {
      return await extractEntitiesViaApiKey(text);
    }
    return await extractEntitiesViaClientLibrary(text);
  } catch (err) {
    console.error('[googleNlp] Entity extraction failed:', err);
    return [];
  }
}

/**
 * Enriches already-fetched articles with Google NLP entities. Google NLP is
 * never an article source — this only annotates text that articleSource has
 * already produced (live RSS or static demo cache). Safe no-op if disabled
 * or if a call fails; never throws and never blocks the pipeline.
 */
export async function enrichArticlesWithGoogleNlp(articles: Article[]): Promise<EnrichedArticle[]> {
  const status = getNlpStatus();
  if (!status.enabled) {
    return articles.map((a) => ({ ...a }));
  }

  const enriched: EnrichedArticle[] = [];
  for (const article of articles) {
    try {
      const text = `${article.title}. ${article.excerpt || article.content || ''}`.slice(0, 3000);
      const entities = await extractEntities(text);
      const topEntityNames = entities
        .slice()
        .sort((a, b) => b.salience - a.salience)
        .slice(0, 5)
        .map((e) => e.name)
        .filter(Boolean);

      enriched.push({
        ...article,
        tags: Array.from(new Set([...(article.tags || []), ...topEntityNames])),
        nlpEntities: entities,
      });
    } catch (err) {
      console.error('[googleNlp] Enrichment failed for article', article.id, err);
      enriched.push({ ...article });
    }
  }
  return enriched;
}

export { getNlpStatus };
