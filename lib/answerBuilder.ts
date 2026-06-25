import { TopicMatchResult, TopicPulseAnswer, KeyDevelopment } from './types';
import { getNlpStatus } from './googleNlp';

// TODO: Claude API grounded answer adapter — replace buildSummary() when available
// import { generateGroundedSummary } from './adapters/claudeAdapter';

// TODO: GA4 ranking adapter — use engagement signals to re-rank relatedArticles
// import { rankByEngagement } from './adapters/ga4Adapter';

function buildSummary(result: TopicMatchResult): string {
  if (result.confidence === 'none') {
    return `I could not find relevant source coverage for "${result.topic}" in today's demo cache.`;
  }

  if (result.confidence === 'low') {
    return `I found limited source coverage for "${result.topic}" in today's demo cache. One matching article is shown below.`;
  }

  const topArticles = result.articles.slice(0, 3);
  const headlines = topArticles.map((a) => a.title).join('; ');

  // Only mention categories that actually appear in the matched set
  const matchedCategories = [...new Set(result.articles.map((a) => a.category))];
  const categoryLabel =
    matchedCategories.length === 1
      ? matchedCategories[0]
      : matchedCategories.slice(0, 2).join(' and ');

  const count = result.articles.length;

  return (
    `Here is today's pulse on "${result.topic}": ${headlines}. ` +
    `Found ${count} source article${count > 1 ? 's' : ''} under ${categoryLabel}.`
  );
}

function buildKeyDevelopments(result: TopicMatchResult): KeyDevelopment[] {
  // Max 4 key developments
  return result.articles.slice(0, 4).map((article) => ({
    text: article.excerpt,
    sourceId: article.id,
    sourceTitle: article.title,
    sourceUrl: article.url,
  }));
}

function buildCaveat(result: TopicMatchResult): string | null {
  if (result.confidence === 'none') {
    return 'No matching articles found in the current demo cache. Try a more specific topic, or refresh the cache after adding new articles.';
  }
  if (result.confidence === 'low') {
    return 'Only one matching article was found. This summary reflects limited coverage and may not be complete.';
  }
  return null;
}

function getSourceMode(): TopicPulseAnswer['sourceMode'] {
  return getNlpStatus().enabled ? 'google-nlp-enriched' : 'static-demo-cache';
}

export function buildAnswer(result: TopicMatchResult): TopicPulseAnswer {
  // Cap related articles at 6; sources used = actual matched count (not total cache)
  const relatedArticles = result.articles.slice(0, 6);

  return {
    topic: result.topic,
    confidence: result.confidence,
    summary: buildSummary(result),
    keyDevelopments: buildKeyDevelopments(result),
    relatedArticles,
    sourcesUsed: result.articles.length,
    lastUpdated: new Date().toISOString(),
    sourceMode: getSourceMode(),
    caveat: buildCaveat(result),
  };
}
