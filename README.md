# Topic Pulse

An AI-powered topic assistant widget for news websites. Readers can ask "What happened today in RBI?" and get a grounded, source-linked summary without any hallucinations.

## What V1 does

- Floating widget embeddable on WordPress via two lines of HTML
- Topic matching from a static article cache (20 sample articles across 8 topic clusters)
- Source-linked answers with confidence badges (High / Medium / Low)
- Key developments each linked to source articles
- Feedback capture (Yes / No) sent to `/api/topic-pulse/feedback`
- Cache refresh endpoint at `/api/topic-pulse/refresh`
- Health check at `/api/health`
- Google NLP entity extraction (optional, off by default)

## What V1 does NOT do

- Does not use Claude API or any LLM (all answers are template-based and grounded)
- Does not use OpenAI API
- Does not connect to WordPress REST API (uses local `sample-articles.json`)
- Does not use GA4 API
- Does not require Supabase (uses local JSON fallback for feedback)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` if needed (defaults work out of the box for V1).

### 3. Build the topic cache

```bash
npm run build:cache
```

This reads `public/data/sample-articles.json` and writes `public/data/topic-pulse-cache.json`. A pre-built cache is included so this step is optional for the demo.

### 4. Run locally

```bash
npm run dev
```

Visit:
- http://localhost:3000 — Demo page with widget
- http://localhost:3000/api/health
- http://localhost:3000/api/topic-pulse/query?query=RBI
- http://localhost:3000/api/topic-pulse/query?query=stock+market
- http://localhost:3000/api/topic-pulse/query?query=Delhi

### 5. Production build

```bash
npm run build
npm start
```

## Vercel Deploy

1. Push this repo to GitHub
2. Import in Vercel
3. Add environment variables from `.env.example` in Vercel dashboard
4. Deploy

## WordPress Embed Snippet

After deploying to Vercel, add this to any WordPress page/post (or the theme footer):

```html
<div id="topic-pulse-root"></div>
<link rel="stylesheet" href="https://YOUR-VERCEL-DOMAIN/widget/topic-pulse-widget.css">
<script src="https://YOUR-VERCEL-DOMAIN/widget/topic-pulse-widget.js" defer></script>
```

Replace `YOUR-VERCEL-DOMAIN` with your actual Vercel deployment URL.

## Google NLP (optional)

To enable Google Cloud Natural Language entity enrichment:

1. Create a Google Cloud project and enable the Natural Language API
2. Create a service account and download the JSON key
3. Base64-encode it: `base64 -i service-account.json`
4. Set in `.env.local`:
   ```
   GOOGLE_NLP_ENABLED=true
   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64-string>
   ```
5. Run `npm run build:cache` to re-enrich the article cache

## Later Upgrade Plan

### Claude API (grounded answer generation)
- Add `ANTHROPIC_API_KEY` to `.env.local`
- Implement `lib/adapters/claudeAdapter.ts`
- Replace `buildSummary()` in `lib/answerBuilder.ts` with Claude-generated grounded summaries
- Stub is already marked with `// TODO: Claude API grounded answer adapter`

### WordPress REST API (live article source)
- Implement `lib/adapters/wordpressAdapter.ts`
- Replace `loadArticles()` in `lib/articleSource.ts`
- Stub is already marked with `// TODO: WordPress REST API adapter`

### GA4 API (engagement ranking)
- Add GA4 credentials to env
- Implement `lib/adapters/ga4Adapter.ts`
- Re-rank `relatedArticles` in `lib/answerBuilder.ts` by pageview/engagement signals
- Stub is already marked with `// TODO: GA4 ranking adapter`

### Supabase (feedback persistence)
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to env
- Set `FEEDBACK_STORE_MODE=supabase` in env
- Uncomment the Supabase adapter in `lib/feedbackStore.ts`

### Google Sheets (feedback persistence alternative)
- Set `GOOGLE_SHEETS_ENABLED=true`, `GOOGLE_SHEETS_ID`, and `GOOGLE_SHEETS_TAB`
- Implement the Google Sheets adapter in `lib/feedbackStore.ts`
