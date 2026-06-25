export default function HomePage() {
  return (
    <>
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '56px 24px 40px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span
            style={{
              background: '#d32f2f',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 4,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            AI
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>
            Topic Pulse
          </span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#111', margin: '0 0 14px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          AI-powered topic assistant<br />for Indian news.
        </h1>

        <p style={{ color: '#555', fontSize: 16, lineHeight: 1.7, margin: '0 0 32px', maxWidth: 520 }}>
          Ask anything that happened today — any topic, location, company, market, or event.
          Topic Pulse finds relevant coverage and gives you a structured pulse in seconds.
        </p>

        {/* Example query pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#fff',
            border: '1.5px solid #e8e8e8',
            borderRadius: 10,
            padding: '12px 18px',
            marginBottom: 48,
            fontSize: 14,
            color: '#333',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{ color: '#bbb', fontSize: 13 }}>Try:</span>
          <span style={{ fontWeight: 600 }}>&ldquo;What happened today in RBI?&rdquo;</span>
          <span
            style={{
              background: '#d32f2f',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 6,
              cursor: 'default',
            }}
          >
            Get Pulse
          </span>
        </div>

        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 6 }}>
          Click the <strong style={{ color: '#d32f2f' }}>Topic Pulse</strong> button at the bottom-right to open the assistant.
        </p>

        {/* API links — small, below the fold */}
        <details style={{ marginTop: 48, color: '#aaa' }}>
          <summary
            style={{
              fontSize: 12,
              cursor: 'pointer',
              userSelect: 'none',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 600,
              outline: 'none',
            }}
          >
            API endpoints
          </summary>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['/api/health',                          'System health'],
              ['/api/topic-pulse/pulses',              'Today\'s dynamic pulses'],
              ['/api/topic-pulse/query?query=RBI',     'Query: RBI'],
              ['/api/topic-pulse/query?query=stock+market', 'Query: Stock Market'],
              ['/api/topic-pulse/query?query=Delhi',   'Query: Delhi'],
              ['/api/topic-pulse/query?query=weather', 'Query: Weather'],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#d32f2f', fontFamily: 'monospace', fontSize: 13, textDecoration: 'none' }}
                >
                  {href}
                </a>
                <span style={{ color: '#ccc', marginLeft: 10, fontSize: 12 }}>— {label}</span>
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
