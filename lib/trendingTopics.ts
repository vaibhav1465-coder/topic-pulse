import { Article } from './types';
import { loadArticles } from './articleSource';

export interface TopicPulse {
  label: string;
  query: string;
  articleCount: number;
  category: string;
  reason: string;
}

interface ClusterDef {
  id: string;
  signals: string[];
  baseLabel: string;
  query: string;
  category: string;
  labelHints: Array<{ tag: string; label: string }>;
}

const CLUSTER_DEFS: ClusterDef[] = [
  {
    id: 'rbi',
    signals: ['rbi', 'reserve bank', 'repo rate', 'monetary policy', 'mpc', 'forex reserve', 'nbfc', 'digital lending', 'banking regulator'],
    baseLabel: 'RBI policy updates',
    query: 'RBI',
    category: 'Banking & Finance',
    labelHints: [
      { tag: 'repo rate', label: 'RBI repo rate decision' },
      { tag: 'digital lending', label: 'RBI digital lending rules' },
      { tag: 'forex reserves', label: 'RBI forex & policy' },
      { tag: 'monetary policy', label: 'RBI monetary policy' },
    ],
  },
  {
    id: 'stock market',
    signals: ['sensex', 'nifty', 'bse', 'nse', 'equity', 'fii', 'market rally', 'stock market', 'small-cap', 'smallcap', 'nifty bank', 'trading session'],
    baseLabel: 'Stock market update',
    query: 'stock market',
    category: 'Markets & Economy',
    labelHints: [
      { tag: 'nifty bank', label: 'Nifty Bank surge' },
      { tag: 'small cap', label: 'Small-cap market rally' },
      { tag: 'sensex', label: 'Sensex & market rally' },
    ],
  },
  {
    id: 'delhi',
    signals: ['delhi', 'new delhi', 'ncr', 'yamuna', 'dtc', 'delhi government'],
    baseLabel: 'Delhi developments',
    query: 'Delhi',
    category: 'Cities & States',
    labelHints: [
      { tag: 'heatwave', label: 'Delhi heatwave alert' },
      { tag: 'yamuna', label: 'Delhi Yamuna flooding' },
      { tag: 'dtc', label: 'Delhi transport policy' },
      { tag: 'temperature', label: 'Delhi heat & weather' },
    ],
  },
  {
    id: 'elections',
    signals: ['election', 'by-election', 'by-polls', 'voting', 'election commission', 'eci', 'nda', 'india bloc', 'constituency', 'results'],
    baseLabel: 'Election updates',
    query: 'elections',
    category: 'Politics',
    labelHints: [
      { tag: 'bihar', label: 'Bihar by-election results' },
      { tag: 'by-polls', label: 'By-election results' },
      { tag: 'election commission', label: 'Election Commission notice' },
      { tag: 'results', label: 'Election results update' },
    ],
  },
  {
    id: 'gold',
    signals: ['gold', 'silver', 'bullion', 'gold price', 'gold rate', 'yellow metal', 'mcx', 'precious metal', 'gold import'],
    baseLabel: 'Gold & commodities',
    query: 'gold',
    category: 'Commodities',
    labelHints: [
      { tag: 'gold import', label: 'Gold import rules' },
      { tag: 'gold price', label: 'Gold price surge' },
      { tag: 'silver', label: 'Gold & silver rally' },
    ],
  },
  {
    id: 'startups',
    signals: ['startup', 'funding', 'venture capital', 'unicorn', 'ipo', 'drhp', 'series b', 'series a', 'seed round', 'saas', 'fintech', 'edtech'],
    baseLabel: 'Startup funding',
    query: 'startups',
    category: 'Startups & Tech',
    labelHints: [
      { tag: 'ipo', label: 'Startup IPO filings' },
      { tag: 'funding', label: 'Startup funding surge' },
      { tag: 'unicorn', label: 'Indian unicorn watch' },
      { tag: 'series b', label: 'Startup Series B rounds' },
    ],
  },
  {
    id: 'parliament',
    signals: ['parliament', 'lok sabha', 'rajya sabha', 'bill', 'walkout', 'legislation', 'amendment', 'opposition', 'dpdp'],
    baseLabel: 'Parliament session',
    query: 'parliament',
    category: 'Politics & Law',
    labelHints: [
      { tag: 'dpdp', label: 'Data protection bill debate' },
      { tag: 'walkout', label: 'Parliament opposition walkout' },
      { tag: 'legislation', label: 'Parliament legislative session' },
    ],
  },
  {
    id: 'weather',
    signals: ['weather', 'rainfall', 'imd', 'monsoon', 'heatwave', 'cyclone', 'flood', 'celsius', 'bay of bengal', 'ndrf', 'red alert'],
    baseLabel: 'Weather alerts',
    query: 'weather',
    category: 'Weather & Climate',
    labelHints: [
      { tag: 'monsoon', label: 'Monsoon forecast alert' },
      { tag: 'cyclone', label: 'Cyclone warning issued' },
      { tag: 'heatwave', label: 'Heatwave red alert' },
      { tag: 'red alert', label: 'Weather red alert' },
    ],
  },
];

function articleMatchesCluster(article: Article, signals: string[]): boolean {
  const fullText = [article.title, article.excerpt, article.content].join(' ').toLowerCase();
  const tagsLower = article.tags.map((t) => t.toLowerCase());
  return signals.some((signal) => {
    const sl = signal.toLowerCase();
    if (tagsLower.some((tag) => tag === sl || tag.includes(sl) || sl.includes(tag))) return true;
    if (sl.length <= 4) {
      return new RegExp('\\b' + sl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(fullText);
    }
    return fullText.includes(sl);
  });
}

function pickLabel(cluster: ClusterDef, articles: Article[]): string {
  const allTags = articles.flatMap((a) => a.tags.map((t) => t.toLowerCase()));
  for (const hint of cluster.labelHints) {
    if (allTags.some((tag) => tag === hint.tag || tag.includes(hint.tag) || hint.tag.includes(tag))) {
      return hint.label;
    }
  }
  return cluster.baseLabel;
}

function buildReason(articles: Article[]): string {
  const sources = [...new Set(articles.map((a) => a.source))];
  return sources.slice(0, 2).join(', ');
}

export function getDynamicPulses(sourceArticles?: Article[]): TopicPulse[] {
  const articles = sourceArticles && sourceArticles.length ? sourceArticles : loadArticles();
  const now = Date.now();

  const scored = CLUSTER_DEFS.map((cluster) => {
    const matched = articles.filter((a) => articleMatchesCluster(a, cluster.signals));
    if (matched.length === 0) return null;

    const recencyBonus = matched.reduce((sum, a) => {
      const hoursAgo = (now - new Date(a.publishedAt).getTime()) / 3_600_000;
      return sum + (hoursAgo <= 24 ? 2 : hoursAgo <= 48 ? 1 : 0);
    }, 0);

    const uniqueSources = new Set(matched.map((a) => a.source)).size;
    const score = matched.length * 10 + recencyBonus + uniqueSources;

    return {
      pulse: {
        label: pickLabel(cluster, matched),
        query: cluster.query,
        articleCount: matched.length,
        category: cluster.category,
        reason: buildReason(matched),
      } as TopicPulse,
      score,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.pulse);
}
