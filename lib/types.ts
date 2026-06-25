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

export interface TopicPulseAnswer {
  topic: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  summary: string;
  keyDevelopments: KeyDevelopment[];
  relatedArticles: Article[];
  sourcesUsed: number;
  lastUpdated: string;
  sourceMode: 'static-demo-cache' | 'google-nlp-enriched' | 'wordpress-api';
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

export interface TopicCache {
  builtAt: string;
  articleCount: number;
  articles: EnrichedArticle[];
  topics: string[];
  nlpEnabled: boolean;
}
