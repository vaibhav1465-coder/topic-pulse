const demoStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  body {
    background: #f3f4f6 !important;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    margin: 0;
  }

  .demo-container {
    max-width: 680px;
    margin: 0 auto;
    padding: 52px 24px 140px;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 44px;
  }

  .demo-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  .demo-title {
    font-size: 40px;
    font-weight: 800;
    margin: 0 0 12px;
    letter-spacing: -0.025em;
    background: linear-gradient(135deg, #6366f1, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .demo-subtitle {
    font-size: 16px;
    color: #6b7280;
    margin: 0 0 28px;
    line-height: 1.6;
  }

  .demo-cta-hint {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 14px;
    color: #374151;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    font-weight: 500;
  }

  .demo-cta-hint strong {
    background: linear-gradient(135deg, #6366f1, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
  }

  .demo-instructions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin: 40px 0 32px;
  }

  .demo-card {
    background: #fff;
    border-radius: 16px;
    padding: 22px 18px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    border: 1.5px solid #e5e7eb;
  }

  .demo-card-icon {
    font-size: 26px;
    margin-bottom: 10px;
    display: block;
  }

  .demo-card-title {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 6px;
  }

  .demo-card-text {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.55;
    margin: 0;
  }

  .demo-note {
    background: rgba(99, 102, 241, 0.06);
    border: 1.5px solid rgba(99, 102, 241, 0.2);
    border-radius: 14px;
    padding: 16px 20px;
    font-size: 13px;
    color: #4b5563;
    line-height: 1.65;
    margin-bottom: 40px;
  }

  .demo-note strong {
    color: #1f2937;
    font-weight: 700;
  }

  .demo-apis {
    border-top: 1px solid #e5e7eb;
    padding-top: 28px;
  }

  .demo-apis summary {
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    user-select: none;
    outline: none;
    list-style: none;
    margin-bottom: 14px;
  }
  .demo-apis summary::-webkit-details-marker { display: none; }

  .demo-api-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .demo-api-list li {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .demo-api-link {
    color: #6366f1;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
    font-size: 13px;
    text-decoration: none;
  }
  .demo-api-link:hover { text-decoration: underline; }

  .demo-api-desc {
    color: #d1d5db;
    font-size: 12px;
  }

  @media (max-width: 640px) {
    .demo-title { font-size: 30px; }
    .demo-instructions { grid-template-columns: 1fr; }
    .demo-container { padding: 36px 16px 140px; }
  }
`;

export default function HomePage() {
  const apis: [string, string][] = [
    ['/api/health',                          'System health'],
    ['/api/topic-pulse/pulses',              "Today's dynamic pulses"],
    ['/api/topic-pulse/query?query=RBI',     'Query: RBI'],
    ['/api/topic-pulse/query?query=stock+market', 'Query: Stock Market'],
    ['/api/topic-pulse/query?query=Delhi',   'Query: Delhi'],
    ['/api/topic-pulse/query?query=weather', 'Query: Weather'],
  ];

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: demoStyles }} />

      <div className="demo-container">
        <div className="demo-header">
          <div className="demo-badge">⚡ AI Assistant</div>
          <h1 className="demo-title">Topic Pulse</h1>
          <p className="demo-subtitle">
            AI-powered topic assistant for recurring news topics and locations
          </p>
          <div className="demo-cta-hint">
            Click the <strong>Topic Pulse</strong> button at the bottom-right to open the assistant
          </div>
        </div>

        <div className="demo-instructions">
          <div className="demo-card">
            <span className="demo-card-icon">💬</span>
            <div className="demo-card-title">Open the Widget</div>
            <p className="demo-card-text">
              Click the floating gradient button at the bottom-right corner.
            </p>
          </div>
          <div className="demo-card">
            <span className="demo-card-icon">🔍</span>
            <div className="demo-card-title">Search Any Topic</div>
            <p className="demo-card-text">
              Type any topic, company, location, or event — or tap a Quick Pulse card.
            </p>
          </div>
          <div className="demo-card">
            <span className="demo-card-icon">📰</span>
            <div className="demo-card-title">Get Instant Pulse</div>
            <p className="demo-card-text">
              Receive a structured summary with key developments and related coverage.
            </p>
          </div>
        </div>

        <div className="demo-note">
          <strong>Try these queries:</strong> RBI, stock market, Delhi, weather, elections, gold —
          or any trending topic from today&rsquo;s news.
        </div>

        <details className="demo-apis">
          <summary>API Endpoints</summary>
          <ul className="demo-api-list">
            {apis.map(([href, label]) => (
              <li key={href}>
                <a className="demo-api-link" href={href} target="_blank" rel="noreferrer">
                  {href}
                </a>
                <span className="demo-api-desc">— {label}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* Widget embed — same method used on WordPress */}
      <link rel="stylesheet" href="/widget/topic-pulse-widget.css" />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/widget/topic-pulse-widget.js" defer></script>
    </>
  );
}
