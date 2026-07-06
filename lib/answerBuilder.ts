import { TopicMatchResult, TopicPulseAnswer, KeyDevelopment, EnrichedArticle, SourceBreakdown } from './types';
import { getNlpStatus } from './googleNlp';
import { isValidArticleUrl } from './articleSource';

// TODO: Claude API grounded answer adapter — replace buildSummary() when available
// import { generateGroundedSummary } from './adapters/claudeAdapter';

// TODO: GA4 ranking adapter — use engagement signals to re-rank relatedArticles
// import { rankByEngagement } from './adapters/ga4Adapter';

// Superset of TopicMatchResult — also accepts the hybrid result from
// topicEngine.findArticlesWithFallback (which carries an extra matchTier field
// used to write an honest summary/caveat when the softened tier had to kick in).
interface AnswerInput extends TopicMatchResult {
  matchTier?: 'exact' | 'soft-match' | 'insufficient';
}

function buildSummary(result: AnswerInput, hasValidCards: boolean): string {
  const count = result.articles.length;

  if (count === 0) {
    return `I could not find any source coverage for "${result.topic}" right now.`;
  }

  const topArticles = result.articles.slice(0, 3);
  const headlines = topArticles.map((a) => a.title).join('; ');

  // Only mention categories that actually appear in the matched set
  const matchedCategories = [...new Set(result.articles.map((a) => a.category))];
  const categoryLabel =
    matchedCategories.length === 1
      ? matchedCategories[0]
      : matchedCategories.slice(0, 2).join(' and ');

  if (!hasValidCards) {
    return `Here is what today's source coverage says about "${result.topic}": ${headlines}. Live article links for this specific topic aren't available yet.`;
  }

  if (result.matchTier === 'soft-match' || result.confidence === 'low') {
    return `I found limited coverage for "${result.topic}". Here's what's available: ${headlines}.`;
  }

  return (
    `Here is today's pulse on "${result.topic}": ${headlines}. ` +
    `Found ${count} source article${count > 1 ? 's' : ''} under ${categoryLabel}.`
  );
}

function buildKeyDevelopmentText(article: EnrichedArticle): string {
  if (article.excerpt && article.excerpt.trim().length > 0) return article.excerpt;
  if (article.content && article.content.trim().length > 0) return article.content.slice(0, 180);
  return article.title;
}

function buildKeyDevelopments(result: AnswerInput): KeyDevelopment[] {
  // Max 4 key developments; excerpt first, fall back to first 180 chars of content,
  // then the title itself so a development is never blank. Sourced from the full
  // strictly-matched pool (including fallback-cache articles without a clickable
  // URL) — Key Developments never link out, so URL validity doesn't apply here.
  return result.articles.slice(0, 4).map((article) => ({
    text: buildKeyDevelopmentText(article),
    sourceId: article.id,
    sourceTitle: article.title,
    sourceUrl: article.url,
  }));
}

function buildCaveat(result: AnswerInput, hasValidCards: boolean): string | null {
  if (result.articles.length === 0) {
    return 'No matching articles found right now. Try a more specific topic.';
  }
  if (!hasValidCards) {
    return 'No strongly related live articles found for this specific topic yet.';
  }
  if (result.matchTier === 'soft-match') {
    return 'Showing the closest available coverage for this topic.';
  }
  if (result.confidence === 'low') {
    return 'Limited exact-match coverage was found; showing the closest available articles.';
  }
  return null;
}

function computeSourceMode(articles: EnrichedArticle[]): TopicPulseAnswer['sourceMode'] {
  const liveCount = articles.filter((a) => a.sourceMode === 'live-rss-feed').length;
  const fallbackCount = articles.filter((a) => a.sourceMode === 'static-demo-cache').length;
  if (liveCount > 0 && fallbackCount > 0) return 'hybrid-live-rss-cache';
  if (liveCount > 0) return 'live-rss-feed';
  return 'static-demo-cache';
}

function computeSourceLabel(sourceMode: TopicPulseAnswer['sourceMode'], nlpEnabled: boolean): string {
  const base =
    {
      'hybrid-live-rss-cache': 'Live RSS + Recent cache',
      'live-rss-feed': 'Live RSS feed',
      'static-demo-cache': 'Recent fallback cache',
      'wordpress-api': 'WordPress REST API',
      'google-nlp-enriched': 'Recent fallback cache',
    }[sourceMode] || 'Recent fallback cache';

  return nlpEnabled ? `${base} + Google NLP` : base;
}

export function buildAnswer(result: AnswerInput): TopicPulseAnswer {
  // Only real, clickable indianexpress.com article pages become cards — fallback
  // cache (example.com) articles may still inform the summary/key developments
  // above, but never render as a fake clickable Main Article / Related Coverage card.
  const validArticles = result.articles.filter((a) => isValidArticleUrl(a.url));
  const relatedArticles = validArticles.slice(0, 8);
  const hasValidCards = relatedArticles.length > 0;

  const nlpEnabled = getNlpStatus().enabled;
  const sourceMode = computeSourceMode(result.articles);

  const sourceBreakdown: SourceBreakdown = {
    liveRss: result.articles.filter((a) => a.sourceMode === 'live-rss-feed').length,
    googleNlp: nlpEnabled,
    googleTrends: false,
    fallbackCache: result.articles.filter((a) => a.sourceMode === 'static-demo-cache').length,
    wordpressRestApi: false,
  };

  return {
    topic: result.topic,
    confidence: result.confidence,
    summary: buildSummary(result, hasValidCards),
    keyDevelopments: buildKeyDevelopments(result),
    relatedArticles,
    sourcesUsed: result.articles.length,
    lastUpdated: new Date().toISOString(),
    sourceMode,
    sourceLabel: computeSourceLabel(sourceMode, nlpEnabled),
    sourceBreakdown,
    caveat: buildCaveat(result, hasValidCards),
  };
}
