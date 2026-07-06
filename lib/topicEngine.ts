import { EnrichedArticle, TopicMatchResult } from './types';
import { isValidArticleUrl } from './articleSource';

// Words that carry no topic signal and must be ignored. "results" is deliberately
// included — as a lone free-text signal it matches almost anything ("exam
// results", "financial results", "match results"), which is exactly the kind
// of false-positive this engine exists to avoid.
const NOISE_WORDS = new Set([
  'today', 'update', 'news', 'latest', 'happened', 'what', 'in', 'on',
  'about', 'show', 'explain', 'tell', 'me', 'the', 'a', 'an', 'is',
  'are', 'was', 'were', 'get', 'give', 'find', 'search', 'look',
  'happening', 'new', 'recent', 'current', 'now', 'yesterday', 'results',
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
  'elections': ['election', 'elections', 'by-election', 'by-elections', 'byelection', 'bypoll',
    'polls', 'voting', 'vote', 'campaign', 'constituency', 'election commission',
    'eci', 'ballot', 'voter', 'poll code'],
  'gold': ['gold', 'silver', 'bullion', 'gold price', 'gold rate', 'commodity',
    'commodities', 'yellow metal', 'mcx', 'precious metal'],
  'startups': ['startup', 'startups', 'funding', 'venture capital', 'vc', 'unicorn',
    'founder', 'series a', 'series b', 'series c', 'seed round', 'ipo', 'drhp',
    'valuation', 'fintech startup', 'edtech', 'saas'],
  'parliament': ['parliament', 'lok sabha', 'rajya sabha', 'bill', 'session',
    'speaker', 'opposition walkout', 'walkout', 'legislation', 'amendment',
    'house adjourned', 'question hour', 'parliamentary', 'the house', 'rule 267'],
};

// ─────────────────────────────────────────────────────────────────────────
// Strict clusters — compound/specific intents need ALL of several signal
// groups to match, not just any one loose keyword. This is what keeps a
// cluster like "Delhi heatwave alert" from pulling in unrelated Delhi EV/
// school-policy articles that only satisfy the "Delhi" half of the intent.
// ─────────────────────────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return (text || '').toLowerCase();
}

export function hasAny(text: string, terms: string[]): boolean {
  const t = normalizeText(text);
  return terms.some((term) => {
    const sl = term.toLowerCase();
    if (sl.length <= 4) {
      return new RegExp('\\b' + sl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t);
    }
    return t.includes(sl);
  });
}

function matchesGroups(fullText: string, tagsLower: string[], groups: string[][]): boolean {
  // Tags go through the same word-boundary-aware hasAny() as body text — a raw
  // substring check here previously let e.g. the tag "Mumbai" satisfy the short
  // term "ai" (Mumbai literally contains "ai"), which is exactly the kind of
  // false positive that was polluting the broad clusters.
  const tagsText = tagsLower.join(' | ');
  return groups.every((group) => hasAny(fullText, group) || hasAny(tagsText, group));
}

export interface ClusterDef {
  id: string;
  label: string;
  query: string;
  category: string;
  /** AND across groups, OR within each group — every group must have at least one hit. */
  groups: string[][];
  minArticles: number;
  /** Articles already claimed by these (more specific) cluster ids are excluded from this one. */
  excludeIds?: string[];
}

// Today's Pulses now uses broad, board-demo-safe cluster labels only — a broad
// label ("Business & markets") is honest about covering mixed-but-related
// content, unlike a narrow label ("Stock market surge") that overpromises
// specificity most days' live coverage can't back up. Each is a single OR
// group by design: these labels are meant to be broad, so broad term matching
// is intentional here (unlike a narrow cluster, where the same laxity would
// mislabel unrelated content).
const PULSE_CLUSTER_DEFS: ClusterDef[] = [
  {
    id: 'delhi-city',
    label: 'Delhi city updates',
    query: 'Delhi city updates',
    category: 'Cities & States',
    // Deliberately anchored to Delhi-specific place terms only — bare "civic",
    // "transport", "school" etc. are generic enough to match any city's local
    // news (e.g. a Pune schools story), which is exactly the kind of off-topic
    // bleed this cluster must avoid. Category (IE tags these by city) backstops
    // civic/transport/school stories that are genuinely about Delhi.
    groups: [['delhi', 'ncr', 'karol bagh', 'mcd', 'yamuna']],
    minArticles: 4,
  },
  {
    id: 'business-markets',
    label: 'Business & markets',
    query: 'Business & markets',
    category: 'Business & Markets',
    // Bare "shares" dropped — it's at least as often the verb ("X shares a
    // photo") as it is stock shares; "share price" stays as the specific form.
    groups: [['business', 'market', 'sensex', 'nifty', 'bse', 'nse', 'stock', 'share price', 'company', 'bank', 'rbi', 'economy', 'rupee', 'ipo', 'startup', 'funding']],
    minArticles: 4,
  },
  {
    id: 'politics-governance',
    label: 'Politics & governance',
    query: 'Politics & governance',
    category: 'Politics & Governance',
    groups: [['politics', 'government', 'minister', 'parliament', 'lok sabha', 'rajya sabha', 'bill', 'law', 'policy', 'election', 'polls', 'party', 'cabinet']],
    minArticles: 4,
  },
  {
    id: 'weather-monsoon',
    label: 'Weather & monsoon',
    query: 'Weather & monsoon',
    category: 'Weather & Climate',
    groups: [['weather', 'rain', 'monsoon', 'imd', 'cyclone', 'flood', 'heatwave', 'temperature', 'rainfall', 'landslide']],
    minArticles: 4,
  },
  {
    id: 'technology-startups',
    label: 'Technology & startups',
    query: 'Technology & startups',
    category: 'Startups & Tech',
    groups: [['technology', 'tech', 'startup', 'startups', 'ai', 'funding', 'ipo', 'drhp', 'fintech', 'app', 'digital']],
    minArticles: 4,
  },
  {
    id: 'sports-updates',
    label: 'Sports updates',
    query: 'Sports updates',
    category: 'Sports',
    groups: [['sports', 'cricket', 'football', 'fifa', 'tennis', 'match', 'team', 'player', 'tournament']],
    minArticles: 4,
  },
  {
    id: 'explained-policy',
    label: 'Explained & policy',
    query: 'Explained & policy',
    category: 'Explained',
    // Bare "why"/"how" dropped — nearly every headline-writing style uses them
    // ("How a tiny boy became..."), regardless of subject; "what it means" is
    // kept as the specific explainer-style phrase.
    groups: [['explained', 'policy', 'law', 'rule', 'regulation', 'bill', 'what it means']],
    minArticles: 4,
  },
  {
    id: 'entertainment-lifestyle',
    label: 'Entertainment & lifestyle',
    query: 'Entertainment & lifestyle',
    category: 'Entertainment & Lifestyle',
    groups: [['entertainment', 'cinema', 'film', 'bollywood', 'actor', 'lifestyle', 'health', 'food', 'travel']],
    minArticles: 4,
  },
];

// Recognized only for manual-query strictness (e.g. someone explicitly searching
// "Bihar by-election results" or "Delhi heatwave") — never surfaced as a Today's
// Pulse card. Keeps narrow free-text queries from falling back to loose,
// single-word OR matching (which is what let unrelated articles slip in before).
const QUERY_ONLY_STRICT_RULES: ClusterDef[] = [
  {
    id: 'delhi-heatwave',
    label: 'Delhi heatwave alert',
    query: 'Delhi heatwave',
    category: 'Weather & Climate',
    groups: [
      ['delhi', 'ncr'],
      ['heatwave', 'heat wave', 'heat', 'temperature', 'imd', 'weather', 'rain', 'rainfall', 'flood', 'yamuna'],
    ],
    minArticles: 1,
  },
  {
    id: 'bihar-election',
    label: 'Bihar by-election results',
    query: 'Bihar by-election',
    category: 'Politics',
    groups: [
      ['bihar', 'bihari'],
      ['by-election', 'by-elections', 'byelection', 'bypoll', 'election', 'elections', 'polls', 'vote', 'assembly', 'constituency'],
    ],
    minArticles: 1,
  },
];

const ALL_CLUSTER_DEFS: ClusterDef[] = [...QUERY_ONLY_STRICT_RULES, ...PULSE_CLUSTER_DEFS];

export function getClusterRule(queryOrLabel: string): ClusterDef | null {
  const q = queryOrLabel.toLowerCase().trim();
  const byQuery = ALL_CLUSTER_DEFS.find((d) => d.query.toLowerCase() === q);
  if (byQuery) return byQuery;
  const byLabel = ALL_CLUSTER_DEFS.find((d) => d.label.toLowerCase() === q);
  if (byLabel) return byLabel;
  // Heuristic: only strict-gate a free-text query if every id word (e.g. "delhi",
  // "heatwave") literally appears in it — avoids strict-gating unrelated queries.
  for (const def of ALL_CLUSTER_DEFS) {
    const idWords = def.id.split('-');
    if (idWords.length > 1 && idWords.every((w) => q.includes(w))) return def;
  }
  return null;
}

export function articleMatchesCluster(article: EnrichedArticle, rule: ClusterDef): boolean {
  // Deliberately excludes the long `content` body: with up to 4000 characters of
  // full article text, a single incidental keyword mention deep in the body
  // (e.g. a passing "AI" or "app" reference in an unrelated story) was enough to
  // false-positive into a broad cluster. Title/excerpt/category are what an
  // article is actually about — content is left to the manual-query scorer,
  // which requires multiple signal hits to clear its relevance bar anyway.
  const fullText = normalizeText(`${article.title} ${article.excerpt} ${article.category}`);
  const tagsLower = article.tags.map((t) => t.toLowerCase());
  return matchesGroups(fullText, tagsLower, rule.groups);
}

export function validateCluster(articleCount: number, minArticles: number): boolean {
  return articleCount >= minArticles;
}

/** Fallback labeler for any future ad-hoc cluster that isn't one of the curated CLUSTER_DEFS. */
export function deriveSafeClusterLabel(articles: EnrichedArticle[], baseQuery: string): string {
  const capitalized = baseQuery.charAt(0).toUpperCase() + baseQuery.slice(1);
  if (!articles.length) return `${capitalized} updates`;
  const categories = [...new Set(articles.map((a) => a.category))];
  return categories.length === 1 ? `${capitalized} — ${categories[0]}` : `${capitalized} updates`;
}

export interface StrictCluster {
  label: string;
  query: string;
  category: string;
  requiredSignals: string[];
  optionalSignals: string[];
  articleCount: number;
  articles: EnrichedArticle[];
  validationStatus: 'passed' | 'rejected';
  rejectedReason: string | null;
}

/**
 * Builds Today's Pulses directly from curated, evidence-gated cluster
 * definitions — a cluster is only ever returned if it has enough strictly
 * matched, real (indianexpress.com) article URLs. No hardcoded article counts,
 * no unrelated filler, no cluster shown on a hunch.
 */
export function buildStrictClusters(articles: EnrichedArticle[]): StrictCluster[] {
  const clusters: StrictCluster[] = PULSE_CLUSTER_DEFS.map((def) => {
    const matched = articles.filter((a) => articleMatchesCluster(a, def));

    const validMatched = matched
      .filter((a) => isValidArticleUrl(a.url))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const passed = validateCluster(validMatched.length, def.minArticles);

    return {
      label: def.label,
      query: def.query,
      category: def.category,
      requiredSignals: def.groups.map((g) => g.join(' OR ')),
      optionalSignals: [],
      articleCount: validMatched.length,
      articles: validMatched.slice(0, 5),
      validationStatus: passed ? 'passed' : 'rejected',
      rejectedReason: passed
        ? null
        : `Only ${validMatched.length} valid related article(s) found; minimum ${def.minArticles} required`,
    };
  });

  return clusters
    .filter((c) => c.validationStatus === 'passed')
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, 8);
}

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
  return hasAny(text, signals);
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

  // Gate: for queries matching a curated strict cluster (e.g. "Delhi heatwave",
  // "Bihar by-election") the article must satisfy ALL required signal groups,
  // not just any one keyword — otherwise fall back to the normal single-group
  // "contains any signal" gate.
  const clusterRule = getClusterRule(t);
  const passesGate = clusterRule
    ? matchesGroups(fullText, tagsLower, clusterRule.groups)
    : containsSignal(fullText, signals) || tagsLower.some((tag) => signals.includes(tag));

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
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break: latest matched articles first
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    });

  const confidence = calcConfidence(scored);
  const matched = scored.map((x) => x.article);

  return { articles: matched, confidence, topic };
}

export interface HybridMatchResult extends TopicMatchResult {
  matchTier: 'exact' | 'soft-match' | 'insufficient';
  liveCount: number;
  fallbackCount: number;
}

// A second, softer score bar used only when the strict bar comes up short — same
// topic-signal gate as the strict tier (no vocabulary broadening), just a lower
// bar to admit genuinely-gated-but-weaker matches. This never pulls in a
// different/unrelated topic; it only relaxes how strong the match needs to be.
const SOFT_RELEVANCE_SCORE = 3;
const MIN_TARGET_ARTICLES = 3;
const MAX_RETURNED_ARTICLES = 8;

/**
 * Strict-first, softened-second matching — never widens the topic gate itself
 * (no cross-cluster keyword bleed), only relaxes the score bar when the strong
 * match count is thin. Deliberately does NOT backfill with unrelated "latest"
 * articles — a very specific query (e.g. "Bihar by-election results") is
 * allowed to come back with few or zero articles rather than fabricate relevance.
 */
export function findArticlesWithFallback(pool: EnrichedArticle[], topic: string): HybridMatchResult {
  const signals = getTopicSignals(topic);

  const allScored = pool
    .map((a) => ({ article: a, score: scoreArticle(a, topic, signals) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    });

  const strong = allScored.filter((x) => x.score >= MIN_RELEVANCE_SCORE);
  let selected = strong;
  let matchTier: HybridMatchResult['matchTier'] = 'exact';

  if (selected.length < MIN_TARGET_ARTICLES) {
    const soft = allScored.filter((x) => x.score >= SOFT_RELEVANCE_SCORE);
    if (soft.length > selected.length) {
      selected = soft;
      matchTier = 'soft-match';
    }
  }

  if (selected.length === 0) {
    matchTier = 'insufficient';
  }

  const articles = selected.slice(0, MAX_RETURNED_ARTICLES).map((x) => x.article);
  const confidence = calcConfidence(selected.map((x) => ({ score: x.score })));

  const liveCount = articles.filter((a) => a.sourceMode === 'live-rss-feed').length;
  const fallbackCount = articles.filter((a) => a.sourceMode === 'static-demo-cache').length;

  return { articles, confidence, topic, matchTier, liveCount, fallbackCount };
}
