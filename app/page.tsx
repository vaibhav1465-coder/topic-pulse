import Script from 'next/script';

const pageStyles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --tp-bg: #f6f7fb;
  --tp-card: #ffffff;
  --tp-text: #0f172a;
  --tp-muted: #64748b;
  --tp-border: #e5e7eb;
  --tp-purple: #8b5cf6;
  --tp-pink: #d946ef;
  --tp-indigo: #6366f1;
  --tp-soft-purple: rgba(139, 92, 246, 0.1);
  --tp-shadow: 0 18px 46px rgba(15, 23, 42, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at top, #fbf8ff 0%, var(--tp-bg) 48%, #f3f4f6 100%) !important;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--tp-text);
}

.tp-page {
  width: 100%;
  min-height: 100vh;
  padding: 44px 22px 140px;
}

.tp-shell {
  max-width: 1160px;
  margin: 0 auto;
}

.tp-hero {
  text-align: center;
  margin-bottom: 30px;
}

.tp-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 15px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--tp-indigo);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.tp-title {
  margin: 0 0 12px;
  font-size: 48px;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--tp-indigo), var(--tp-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tp-subtitle {
  max-width: 760px;
  margin: 0 auto 18px;
  color: var(--tp-muted);
  font-size: 16px;
  line-height: 1.6;
}

.tp-one-line {
  display: inline-flex;
  justify-content: center;
  background: var(--tp-card);
  border: 1.5px solid var(--tp-border);
  border-radius: 16px;
  padding: 13px 22px;
  font-size: 14px;
  color: #334155;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  font-weight: 700;
}

.tp-product-visual {
  margin: 34px 0 28px;
  background:
    radial-gradient(circle at 50% 15%, rgba(139, 92, 246, 0.11), transparent 34%),
    #ffffff;
  border: 1.5px solid var(--tp-border);
  border-radius: 30px;
  padding: 30px;
  box-shadow: var(--tp-shadow);
  overflow: hidden;
}

.tp-visual-header {
  text-align: center;
  margin-bottom: 28px;
}

.tp-kicker {
  margin: 0 0 8px;
  color: var(--tp-purple);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tp-section-title {
  margin: 0;
  font-size: 29px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--tp-indigo), var(--tp-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tp-visual-flow {
  display: grid;
  grid-template-columns: 1fr 72px 1.25fr 72px 1fr;
  align-items: center;
  gap: 10px;
}

.tp-panel {
  background: #ffffff;
  border: 1.5px solid var(--tp-border);
  border-radius: 24px;
  padding: 22px;
  min-height: 260px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.tp-panel-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.tp-panel-icon {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(217, 70, 239, 0.12));
  font-size: 21px;
}

.tp-panel-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tp-purple);
}

.tp-panel-title {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.tp-panel-text {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.tp-mini-list {
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.tp-mini-list li {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.tp-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--tp-indigo), var(--tp-pink));
  flex: 0 0 auto;
}

.tp-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tp-arrow-line {
  width: 64px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--tp-indigo), var(--tp-pink));
  position: relative;
}

.tp-arrow-line::after {
  content: "";
  position: absolute;
  right: -1px;
  top: 50%;
  width: 11px;
  height: 11px;
  border-right: 3px solid var(--tp-pink);
  border-top: 3px solid var(--tp-pink);
  transform: translateY(-50%) rotate(45deg);
}

.tp-engine {
  position: relative;
  min-height: 330px;
  border-radius: 30px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.96), rgba(217, 70, 239, 0.94));
  box-shadow: 0 22px 55px rgba(139, 92, 246, 0.28);
  color: #ffffff;
  overflow: hidden;
}

.tp-engine::before {
  content: "";
  position: absolute;
  width: 330px;
  height: 330px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  top: -150px;
  right: -120px;
}

.tp-engine::after {
  content: "";
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  bottom: -150px;
  left: -100px;
}

.tp-engine-inner {
  position: relative;
  z-index: 2;
}

.tp-engine-badge {
  display: inline-flex;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.tp-engine-title {
  margin: 0 0 10px;
  font-size: 31px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.tp-engine-text {
  margin: 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 14px;
  line-height: 1.6;
}

.tp-engine-steps {
  margin-top: 24px;
  display: grid;
  gap: 10px;
}

.tp-engine-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  font-size: 13px;
  font-weight: 800;
}

.tp-step-number {
  width: 25px;
  height: 25px;
  border-radius: 999px;
  background: #ffffff;
  color: var(--tp-purple);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex: 0 0 auto;
}

.tp-output-grid {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.tp-output-chip {
  padding: 12px 13px;
  border-radius: 15px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 800;
  color: #334155;
}

.tp-journey {
  margin: 28px 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(217, 70, 239, 0.08));
  border: 1.5px solid rgba(139, 92, 246, 0.22);
  border-radius: 24px;
  padding: 24px;
}

.tp-journey-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.tp-journey-item {
  background: #ffffff;
  border: 1.5px solid var(--tp-border);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
}

.tp-journey-icon {
  display: block;
  font-size: 23px;
  margin-bottom: 8px;
}

.tp-journey-text {
  margin: 0;
  color: #111827;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.tp-measures {
  background: #ffffff;
  border: 1.5px solid var(--tp-border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.tp-measure-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.tp-measure-card {
  border: 1.5px solid var(--tp-border);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  background: #ffffff;
}

.tp-measure-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--tp-indigo), var(--tp-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
}

.tp-measure-label {
  display: block;
  font-size: 12px;
  line-height: 1.35;
  color: #475569;
  font-weight: 700;
}

.tp-widget-hint {
  margin: 28px auto 0;
  max-width: 700px;
  text-align: center;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.tp-widget-hint strong {
  color: var(--tp-purple);
}

.tp-api-box {
  margin-top: 34px;
  border-top: 1px solid var(--tp-border);
  padding-top: 24px;
}

.tp-api-box summary {
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  user-select: none;
  outline: none;
  list-style: none;
}

.tp-api-box summary::-webkit-details-marker {
  display: none;
}

.tp-api-list {
  list-style: none;
  padding: 16px 0 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.tp-api-link {
  color: var(--tp-indigo);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  text-decoration: none;
}

.tp-api-link:hover {
  text-decoration: underline;
}

@media (max-width: 1040px) {
  .tp-visual-flow {
    grid-template-columns: 1fr;
  }

  .tp-arrow {
    height: 28px;
    transform: rotate(90deg);
  }

  .tp-panel {
    min-height: auto;
  }

  .tp-journey-row,
  .tp-measure-row {
    overflow-x: auto;
    grid-template-columns: repeat(6, 160px);
    padding-bottom: 8px;
  }
}

@media (max-width: 640px) {
  .tp-page {
    padding: 34px 16px 130px;
  }

  .tp-title {
    font-size: 36px;
  }

  .tp-subtitle {
    font-size: 14px;
  }

  .tp-one-line {
    font-size: 13px;
  }

  .tp-product-visual,
  .tp-journey,
  .tp-measures {
    padding: 18px;
  }

  .tp-section-title {
    font-size: 24px;
  }

  .tp-engine-title {
    font-size: 27px;
  }
}
`;

export default function HomePage() {
  const journey = [
    { icon: '🔎', text: 'Search topic' },
    { icon: '📰', text: 'Check IE stories' },
    { icon: '🧠', text: 'Build cluster' },
    { icon: '⚡', text: 'Generate pulse' },
    { icon: '📌', text: 'Show articles' },
    { icon: '📈', text: 'Measure impact' },
  ];

  const measures = [
    { value: 'Engagement', label: 'User engagement increase' },
    { value: 'Duration', label: 'Average time duration' },
    { value: 'Sessions', label: 'Sessions and repeat visits' },
    { value: 'Depth', label: 'Pages per session' },
    { value: 'Clicks', label: 'Article click-throughs' },
    { value: 'Feedback', label: 'Reader usefulness score' },
  ];

  const apis = [
    '/api/health',
    '/api/topic-pulse/pulses',
    '/api/topic-pulse/query?query=RBI',
    '/api/topic-pulse/query?query=stock+market',
    '/api/topic-pulse/query?query=Delhi',
    '/api/topic-pulse/query?query=weather',
  ];

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />

      <link rel="stylesheet" href="/widget/topic-pulse-widget.css" />
      <Script src="/widget/topic-pulse-widget.js" strategy="afterInteractive" />

      <main className="tp-page">
        <div className="tp-shell">
          <section className="tp-hero">
            <div className="tp-badge">⚡ AI Assistant</div>

            <h1 className="tp-title">Topic Pulse</h1>

            <p className="tp-subtitle">
              AI-powered topic assistant that helps readers understand what changed today and continue reading relevant
              Indian Express stories.
            </p>

            <div className="tp-one-line">
              Understand faster. Discover deeper. Click relevant source stories.
            </div>
          </section>

          <section className="tp-product-visual" aria-label="Topic Pulse product flow">
            <header className="tp-visual-header">
              <p className="tp-kicker">Product Flow</p>
              <h2 className="tp-section-title">From topic confusion to deeper article discovery</h2>
            </header>

            <div className="tp-visual-flow">
              <article className="tp-panel">
                <div className="tp-panel-top">
                  <div className="tp-panel-icon">🧩</div>
                  <div className="tp-panel-label">Problem</div>
                </div>

                <h3 className="tp-panel-title">Scattered coverage</h3>

                <p className="tp-panel-text">
                  Readers miss updates when related stories are spread across many articles.
                </p>

                <ul className="tp-mini-list">
                  <li><span className="tp-dot" /> Too many separate links</li>
                  <li><span className="tp-dot" /> Low topic context</li>
                  <li><span className="tp-dot" /> Missed related stories</li>
                </ul>
              </article>

              <div className="tp-arrow">
                <div className="tp-arrow-line" />
              </div>

              <article className="tp-engine">
                <div className="tp-engine-inner">
                  <div className="tp-engine-badge">Topic Pulse Engine</div>

                  <h3 className="tp-engine-title">Source-backed topic summary</h3>

                  <p className="tp-engine-text">
                    Recent Indian Express stories are matched, clustered, summarized, and converted into useful article
                    discovery paths.
                  </p>

                  <div className="tp-engine-steps">
                    <div className="tp-engine-step">
                      <span className="tp-step-number">1</span>
                      Check recent IE stories
                    </div>

                    <div className="tp-engine-step">
                      <span className="tp-step-number">2</span>
                      Match topic, entity, location
                    </div>

                    <div className="tp-engine-step">
                      <span className="tp-step-number">3</span>
                      Generate Quick Pulse
                    </div>
                  </div>
                </div>
              </article>

              <div className="tp-arrow">
                <div className="tp-arrow-line" />
              </div>

              <article className="tp-panel">
                <div className="tp-panel-top">
                  <div className="tp-panel-icon">📈</div>
                  <div className="tp-panel-label">Outcome</div>
                </div>

                <h3 className="tp-panel-title">Deeper engagement</h3>

                <p className="tp-panel-text">
                  Readers understand faster and continue into relevant source articles.
                </p>

                <div className="tp-output-grid">
                  <div className="tp-output-chip">Quick Pulse</div>
                  <div className="tp-output-chip">Real article cards</div>
                  <div className="tp-output-chip">Tracked clicks</div>
                </div>
              </article>
            </div>
          </section>

          <section className="tp-journey" aria-label="How Topic Pulse works">
            <header className="tp-visual-header">
              <p className="tp-kicker">How it works</p>
              <h2 className="tp-section-title">Simple reader journey</h2>
            </header>

            <div className="tp-journey-row">
              {journey.map((item) => (
                <article className="tp-journey-item" key={item.text}>
                  <span className="tp-journey-icon">{item.icon}</span>
                  <p className="tp-journey-text">{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="tp-measures" aria-label="Topic Pulse success measures">
            <header className="tp-visual-header">
              <p className="tp-kicker">Measures</p>
              <h2 className="tp-section-title">What improves</h2>
            </header>

            <div className="tp-measure-row">
              {measures.map((measure) => (
                <article className="tp-measure-card" key={measure.label}>
                  <span className="tp-measure-value">{measure.value}</span>
                  <span className="tp-measure-label">{measure.label}</span>
                </article>
              ))}
            </div>
          </section>

          <p className="tp-widget-hint">
            Click the <strong>Topic Pulse</strong> button at the bottom-right to open the assistant.
          </p>

          <details className="tp-api-box">
            <summary>API Endpoints</summary>

            <ul className="tp-api-list">
              {apis.map((href) => (
                <li key={href}>
                  <a className="tp-api-link" href={href}>
                    {href}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </main>

      <div id="topic-pulse-root" />
    </>
  );
}