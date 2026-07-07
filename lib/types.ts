export interface Article {
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
  sourceMode?: 'live-rss-feed' | 'static-demo-cache' | 'hybrid-live-rss-cache' | 'wordpress-rest-api';
  sourceLabel?: string;
}

export interface NlpEntity {
  name: string;
  type: string;
  salience: number;
}

export interface EnrichedArticle extends Article {
  nlpEntities?: NlpEntity[];
}

export interface TopicMatchResult {
  articles: EnrichedArticle[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  topic: string;
}

export interface KeyDevelopment {
  text: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface SourceBreakdown {
  liveRss: number;
  googleNlp: boolean;
  googleTrends?: boolean;
  fallbackCache: number;
  wordpressRestApi: boolean;
}

export interface TopicPulseAnswer {
  topic: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  summary: string;
  keyDevelopments: KeyDevelopment[];
  relatedArticles: Article[];
  sourcesUsed: number;
  lastUpdated: string;
  sourceMode: 'static-demo-cache' | 'google-nlp-enriched' | 'wordpress-api' | 'live-rss-feed' | 'hybrid-live-rss-cache';
  sourceLabel: string;
  sourceBreakdown: SourceBreakdown;
  caveat: string | null;
}

export interface FeedbackPayload {
  query: string;
  topic: string;
  useful: boolean;
  comment?: string;
  sourcesUsed?: number;
  timestamp?: string;
}

export interface RegistrationPayload {
  name: string;
  email: string;
  mobile: string;
  query?: string;
  topic?: string;
  timestamp?: string;
}

export interface TopicCache {
  builtAt: string;
  articleCount: number;
  articles: EnrichedArticle[];
  topics: string[];
  nlpEnabled: boolean;
}
