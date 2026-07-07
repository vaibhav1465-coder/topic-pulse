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

// Quick Pulse must read as article-backed, not as freestanding AI commentary —
// the lead-in names exactly where the articles shown above came from.
function quickPulseLeadIn(sourceMode: TopicPulseAnswer['sourceMode']): string {
  if (sourceMode === 'live-rss-feed') return 'Based on the live articles shown above';
  if (sourceMode === 'hybrid-live-rss-cache') return 'Based on the live articles and recent cache shown above';
  if (sourceMode === 'static-demo-cache') return 'Based on the recent cached articles shown above';
  return 'Based on the articles shown above';
}

function buildSummary(result: AnswerInput, hasValidCards: boolean, sourceMode: TopicPulseAnswer['sourceMode']): string {
  const count = result.articles.length;
  const leadIn = quickPulseLeadIn(sourceMode);

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
    return `${leadIn}, coverage for "${result.topic}" is limited. Here's what's available: ${headlines}.`;
  }

  return (
    `${leadIn}, here is the quick pulse on "${result.topic}": ${headlines}. ` +
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

// "Article source" wording only — Google Trends/search-interest is reported
// separately via topicSignalLabel below, never folded into the source label,
// so it can never read as "articles fetched from Google Trends".
function computeSourceLabel(sourceMode: TopicPulseAnswer['sourceMode']): string {
  return (
    {
      'hybrid-live-rss-cache': 'Live articles + recent cache',
      'live-rss-feed': 'Live articles',
      'static-demo-cache': 'Recent cache',
      'wordpress-api': 'WordPress REST API',
      'google-nlp-enriched': 'Recent cache',
    }[sourceMode] || 'Recent cache'
  );
}

function computeTopicSignalLabel(nlpEnabled: boolean, searchInterestActive: boolean): string | null {
  const parts: string[] = [];
  if (nlpEnabled) parts.push('Google NLP');
  if (searchInterestActive) parts.push('Search-interest signals');
  return parts.length ? parts.join(' + ') : null;
}

export function buildAnswer(result: AnswerInput): TopicPulseAnswer & { topicSignalLabel: string | null } {
  // Only real, clickable indianexpress.com article pages become cards — fallback
  // cache (example.com) articles may still inform the summary/key developments
  // above, but never render as a fake clickable Main Article / Related Coverage card.
  const validArticles = result.articles.filter((a) => isValidArticleUrl(a.url));
  const relatedArticles = validArticles.slice(0, 8);
  const hasValidCards = relatedArticles.length > 0;

  const nlpEnabled = getNlpStatus().enabled;
  const sourceMode = computeSourceMode(result.articles);
  const searchInterestActive = false; // no search-interest signal wired up yet

  const sourceBreakdown: SourceBreakdown = {
    liveRss: result.articles.filter((a) => a.sourceMode === 'live-rss-feed').length,
    googleNlp: nlpEnabled,
    googleTrends: searchInterestActive,
    fallbackCache: result.articles.filter((a) => a.sourceMode === 'static-demo-cache').length,
    wordpressRestApi: false,
  };

  return {
    topic: result.topic,
    confidence: result.confidence,
    summary: buildSummary(result, hasValidCards, sourceMode),
    keyDevelopments: buildKeyDevelopments(result),
    relatedArticles,
    sourcesUsed: result.articles.length,
    lastUpdated: new Date().toISOString(),
    sourceMode,
    sourceLabel: computeSourceLabel(sourceMode),
    topicSignalLabel: computeTopicSignalLabel(nlpEnabled, searchInterestActive),
    sourceBreakdown,
    caveat: buildCaveat(result, hasValidCards),
  };
}
