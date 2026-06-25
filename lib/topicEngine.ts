import { EnrichedArticle, TopicMatchResult } from './types';

// Words that carry no topic signal and must be ignored
const NOISE_WORDS = new Set([
  'today', 'update', 'news', 'latest', 'happened', 'what', 'in', 'on',
  'about', 'show', 'explain', 'tell', 'me', 'the', 'a', 'an', 'is',
  'are', 'was', 'were', 'get', 'give', 'find', 'search', 'look',
  'happening', 'new', 'recent', 'current', 'now', 'yesterday',
]);

const STRIP_PHRASES = [
  'what happened today in',
  'what happened in',
  'tell me about',
  'latest news on',
  'latest news about',
  'latest on',
  'news about',
  'update on',
  'today in',
  'update about',
  'what is happening in',
  'what is new in',
  'whats new in',
  "what's new in",
  'show latest only',
  'explain background',
  'show related articles',
  'what changed since yesterday',
];

// Topic-specific signal keywords — articles must contain at least one of these to score
const TOPIC_SIGNALS: Record<string, string[]> = {
  'stock market': ['stock market', 'sensex', 'nifty', 'bse', 'nse', 'benchmark indices',
    'equities', 'fii', 'dii', 'market rally', 'market fall', 'nifty bank', 'small-cap',
    'mid-cap', 'smallcap', 'midcap', 'equity', 'share price', 'index', 'trading session',
    'bse sme', 'sme ipo'],
  'rbi': ['rbi', 'reserve bank', 'repo rate', 'monetary policy', 'mpc', 'forex reserve',
    'foreign exchange reserve', 'rbi governor', 'lending rate', 'crr', 'slr', 'nbfc',
    'digital lending', 'banking regulator'],
  'delhi': ['delhi', 'new delhi', 'ncr', 'yamuna', 'dtc', 'delhi government',
    'delhi cabinet', 'delhi police', 'delhi high court', 'delhi metro', 'safdarjung'],
  'weather': ['weather', 'rainfall', 'rain', 'temperature', 'imd', 'monsoon', 'heatwave',
    'cyclone', 'heat wave', 'flood', 'storm', 'celsius',
    'depression', 'bay of bengal', 'arabian sea', 'ndrf', 'red alert',
    'orange alert', 'weather forecast', 'imd forecast'],
  'elections': ['election', 'elections', 'by-election', 'by-elections', 'polls', 'voting',
    'results', 'campaign', 'constituency', 'mla', 'mp', 'election commission',
    'eci', 'ballot', 'voter', 'poll code', 'nda', 'india bloc', 'ruling alliance'],
  'gold': ['gold', 'silver', 'bullion', 'gold price', 'gold rate', 'commodity',
    'commodities', 'yellow metal', 'mcx', 'precious metal'],
  'startups': ['startup', 'startups', 'funding', 'venture capital', 'vc', 'unicorn',
    'founder', 'series a', 'series b', 'series c', 'seed round', 'ipo', 'drhp',
    'valuation', 'fintech startup', 'edtech', 'saas'],
  'parliament': ['parliament', 'lok sabha', 'rajya sabha', 'bill', 'session',
    'speaker', 'opposition walkout', 'walkout', 'legislation', 'amendment',
    'house adjourned', 'question hour', 'parliamentary', 'the house', 'rule 267'],
};

export function normalizeTopic(query: string): string {
  let q = query.toLowerCase().trim();

  // Strip leading phrases
  for (const phrase of STRIP_PHRASES) {
    if (q.startsWith(phrase)) {
      q = q.slice(phrase.length).trim();
      break;
    }
  }

  // Strip trailing punctuation
  q = q.replace(/[?!.,]+$/, '').trim();

  return q;
}

function getTopicSignals(topic: string): string[] {
  // Direct lookup
  if (TOPIC_SIGNALS[topic]) return TOPIC_SIGNALS[topic];

  // Partial match: e.g. "stock market update" -> "stock market"
  for (const key of Object.keys(TOPIC_SIGNALS)) {
    if (topic.includes(key) || key.includes(topic)) {
      return TOPIC_SIGNALS[key];
    }
  }

  // Fallback: use the topic itself as the only signal word (plus filter noise)
  const words = topic.split(/\s+/).filter((w) => !NOISE_WORDS.has(w));
  return words.length > 0 ? words : [topic];
}

function containsSignal(text: string, signals: string[]): boolean {
  const t = text.toLowerCase();
  return signals.some((s) => {
    const sl = s.toLowerCase();
    // Short tokens (≤4 chars) must match as whole words to avoid false positives
    // e.g. "bse" in "observatory", "nse" in "intense"
    if (sl.length <= 4) {
      return new RegExp('\\b' + sl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t);
    }
    return t.includes(sl);
  });
}

function scoreArticle(article: EnrichedArticle, topic: string, signals: string[]): number {
  const t = topic.toLowerCase();
  let score = 0;

  const titleLower = article.title.toLowerCase();
  const excerptLower = article.excerpt.toLowerCase();
  const contentLower = article.content.toLowerCase();
  const categoryLower = article.category.toLowerCase();
  const tagsLower = article.tags.map((tag) => tag.toLowerCase());
  const fullText = `${titleLower} ${excerptLower} ${contentLower}`;

  // Gate: article must contain at least one topic signal to score at all
  const passesGate =
    containsSignal(fullText, signals) ||
    tagsLower.some((tag) => signals.includes(tag));

  if (!passesGate) return 0;

  // Exact topic phrase in title — strongest signal
  if (titleLower.includes(t)) score += 14;

  // Exact tag match
  if (tagsLower.some((tag) => tag === t)) score += 12;

  // Tag contains topic or topic contains tag (only for non-noise words)
  const topicWords = t.split(/\s+/).filter((w) => !NOISE_WORDS.has(w));
  for (const tw of topicWords) {
    if (tw.length < 3) continue;
    if (tagsLower.some((tag) => tag === tw)) score += 8;
    else if (tagsLower.some((tag) => tag.includes(tw))) score += 4;
  }

  // Category is directly the topic
  if (categoryLower === t) score += 6;
  else if (categoryLower.includes(t) || t.includes(categoryLower)) score += 3;

  // Signal keyword hits (each distinct signal adds points)
  let signalHits = 0;
  for (const signal of signals) {
    if (fullText.includes(signal.toLowerCase())) signalHits++;
  }
  score += Math.min(signalHits * 2, 10); // cap at 10 to avoid inflating from many signals

  // Excerpt/content hits for the topic phrase itself
  if (excerptLower.includes(t)) score += 3;
  if (contentLower.includes(t)) score += 1;

  // NLP entity match
  if (article.nlpEntities) {
    for (const entity of article.nlpEntities) {
      const eName = entity.name.toLowerCase();
      if (topicWords.some((tw) => tw.length >= 3 && (eName.includes(tw) || tw.includes(eName)))) {
        score += Math.round(entity.salience * 5);
      }
    }
  }

  // Recency bonus — modest; topic relevance must drive primary score
  const published = new Date(article.publishedAt).getTime();
  const now = Date.now();
  const hoursAgo = (now - published) / (1000 * 60 * 60);
  if (hoursAgo <= 24) score += 2;
  else if (hoursAgo <= 48) score += 1;

  return score;
}

// Minimum score an article must reach to be considered "relevant"
const MIN_RELEVANCE_SCORE = 7;

function calcConfidence(articles: Array<{ score: number }>): TopicMatchResult['confidence'] {
  const strong = articles.filter((a) => a.score >= MIN_RELEVANCE_SCORE + 4).length;
  const total = articles.length;

  if (strong >= 4) return 'high';
  if (total >= 2) return 'medium';
  if (total === 1) return 'low';
  return 'none';
}

export function findArticlesForTopic(
  articles: EnrichedArticle[],
  topic: string,
): TopicMatchResult {
  const signals = getTopicSignals(topic);

  const scored = articles
    .map((a) => ({ article: a, score: scoreArticle(a, topic, signals) }))
    .filter((x) => x.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score);

  const confidence = calcConfidence(scored);
  const matched = scored.map((x) => x.article);

  return { articles: matched, confidence, topic };
}
