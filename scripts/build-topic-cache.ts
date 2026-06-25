import path from 'path';
import fs from 'fs';

// Inline the types here so this script doesn't depend on Next.js build
interface Article {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  publishedAt: string;
  author: string;
  source: string;
  imageUrl?: string;
}

interface NlpEntity { name: string; type: string; salience: number; }
interface EnrichedArticle extends Article { nlpEntities?: NlpEntity[]; }

interface TopicCache {
  builtAt: string;
  articleCount: number;
  articles: EnrichedArticle[];
  topics: string[];
  nlpEnabled: boolean;
}

const ARTICLES_PATH = path.join(process.cwd(), 'public', 'data', 'sample-articles.json');
const CACHE_PATH = path.join(process.cwd(), 'public', 'data', 'topic-pulse-cache.json');

async function extractEntitiesIfEnabled(text: string): Promise<NlpEntity[]> {
  if (process.env.GOOGLE_NLP_ENABLED !== 'true') return [];
  const hasCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!hasCreds) return [];

  try {
    const { LanguageServiceClient } = require('@google-cloud/language');
    const client = new LanguageServiceClient();
    const [result] = await client.analyzeEntities({
      document: { content: text, type: 'PLAIN_TEXT' },
    });
    return (result.entities || []).map((e: Record<string, unknown>) => ({
      name: String(e.name || ''),
      type: String(e.type || 'UNKNOWN'),
      salience: Number(e.salience || 0),
    }));
  } catch (err) {
    console.error('NLP extraction failed:', err);
    return [];
  }
}

async function main() {
  console.log('\n=== Topic Pulse Cache Builder ===\n');

  if (!fs.existsSync(ARTICLES_PATH)) {
    console.error('ERROR: sample-articles.json not found at', ARTICLES_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(ARTICLES_PATH, 'utf-8');
  const articles: Article[] = JSON.parse(raw);
  console.log('Articles loaded:', articles.length);

  const nlpEnabled = process.env.GOOGLE_NLP_ENABLED === 'true';
  console.log('NLP enabled:', nlpEnabled);

  const enriched: EnrichedArticle[] = [];
  for (const article of articles) {
    if (nlpEnabled) {
      process.stdout.write(`  Enriching [${article.id}]... `);
      const entities = await extractEntitiesIfEnabled(`${article.title}. ${article.excerpt}`);
      enriched.push({ ...article, nlpEntities: entities });
      console.log(`${entities.length} entities`);
    } else {
      enriched.push({ ...article });
    }
  }

  const allTopics = [...new Set(enriched.flatMap((a) => a.tags).map((t) => t.toLowerCase()))].sort();

  const cache: TopicCache = {
    builtAt: new Date().toISOString(),
    articleCount: enriched.length,
    articles: enriched,
    topics: allTopics,
    nlpEnabled,
  };

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log('\n--- Cache Built ---');
  console.log('Articles:', cache.articleCount);
  console.log('Topics:', allTopics.length, '—', allTopics.slice(0, 8).join(', ') + (allTopics.length > 8 ? '...' : ''));
  console.log('NLP:', nlpEnabled ? 'Enabled' : 'Disabled (set GOOGLE_NLP_ENABLED=true to enable)');
  console.log('Cache written to:', CACHE_PATH);
  console.log('');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
