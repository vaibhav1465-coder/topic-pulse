(function () {
  'use strict';

  var API_BASE = (function () {
    if (typeof window !== 'undefined' && window.TOPIC_PULSE_API_BASE) {
      return window.TOPIC_PULSE_API_BASE;
    }
    return '';
  })();

  var FALLBACK_PULSES = [
    { label: 'Delhi city updates',        query: 'Delhi city updates',        articleCount: 4, category: 'Cities & States',          emoji: '🏙️' },
    { label: 'Business & markets',        query: 'Business & markets',        articleCount: 4, category: 'Business & Markets',       emoji: '📈' },
    { label: 'Politics & governance',     query: 'Politics & governance',     articleCount: 4, category: 'Politics & Governance',    emoji: '🏛️' },
    { label: 'Weather & monsoon',         query: 'Weather & monsoon',         articleCount: 4, category: 'Weather & Climate',        emoji: '🌦️' },
    { label: 'Technology & startups',     query: 'Technology & startups',     articleCount: 4, category: 'Startups & Tech',          emoji: '🚀' },
    { label: 'Sports updates',            query: 'Sports updates',            articleCount: 4, category: 'Sports',                   emoji: '🏏' },
    { label: 'Explained & policy',        query: 'Explained & policy',        articleCount: 4, category: 'Explained',                emoji: '📘' },
    { label: 'Entertainment & lifestyle', query: 'Entertainment & lifestyle', articleCount: 4, category: 'Entertainment & Lifestyle', emoji: '🎬' },
  ];

  var METHODOLOGY_STEPS = [
    {
      title: 'Collect Recent News Stories',
      text: 'Pull recent Indian Express article data from the last 2–3 days.',
    },
    {
      title: 'Clean & Filter Articles',
      text: 'Remove noise, drop non-article pages, and keep relevant story URLs.',
    },
    {
      title: 'Understand Topics & Trends',
      text: 'Use article signals, Google NLP, and Google Trends support.',
    },
    {
      title: 'Group Similar Stories',
      text: 'Cluster related stories into simple, user-friendly topics.',
    },
    {
      title: 'Show the Pulse',
      text: 'Present a quick pulse, key developments, and main related articles.',
    },
  ];

  var FOLLOWUP_CHIPS = [
    { label: 'Show latest only',              action: 'sort-latest' },
    { label: 'Related coverage',              action: 'scroll-articles' },
    { label: 'Explain background',            action: 'explain-bg' },
    { label: 'What changed since yesterday?', action: 'compare-yesterday' },
  ];

  var CATEGORY_EMOJI = {
    'Banking & Finance':       '🏦',
    'Markets & Economy':       '📈',
    'Business & Markets':      '📈',
    'Cities & States':         '🏙️',
    'Politics':                '🏛️',
    'Politics & Law':          '⚖️',
    'Politics & Governance':   '🏛️',
    'Commodities':             '📦',
    'Weather & Climate':       '🌦️',
    'Startups & Tech':         '🚀',
    'Energy':                  '⚡',
    'Healthcare':              '🏥',
    'Sports':                  '🏏',
    'International':           '🌍',
    'Explained':               '📘',
    'Entertainment & Lifestyle': '🎬',
  };

  function getCategoryEmoji(category) {
    return CATEGORY_EMOJI[category] || '📰';
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso || ''); }
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // A "real" clickable article page — mirrors lib/articleSource.ts isValidArticleUrl.
  // Fallback demo cache URLs (example.com) and the bare homepage never render as cards.
  function isValidArticleUrl(url) {
    if (!url) return false;
    try {
      var u = new URL(url);
      if (u.hostname !== 'indianexpress.com' && u.hostname !== 'www.indianexpress.com') return false;
      var path = u.pathname.replace(/\/+$/, '');
      if (!path || path === '') return false;
      if (url.indexOf('example.com') !== -1) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function addUtmParams(url, topic, contentTag) {
    try {
      var u = new URL(url);
      u.searchParams.set('utm_source', 'topic_pulse');
      u.searchParams.set('utm_medium', 'widget');
      u.searchParams.set('utm_campaign', 'topic_pulse_discovery');
      u.searchParams.set('utm_content', contentTag);
      u.searchParams.set('utm_term', topic || '');
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function openArticle(a, currentTopic, contentTag) {
    // Defensive only — the API already sends just valid, clickable article URLs,
    // and cards for anything else are never rendered in the first place.
    if (!isValidArticleUrl(a.url)) return;
    var finalUrl = addUtmParams(a.url, currentTopic, contentTag);
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  }

  // ─── State ───
  var _widget = null;
  var _launcher = null;
  var _isOpen = false;
  var _currentQuery = '';
  var _currentData = null;
  var _selectedKeyDevIndex = 0;
  var _keyDevExpanded = false;

  // ─── Article card ───
  function buildArticleCard(a, index, variant) {
    return (
      '<div class="article-card clickable ' + variant + '" data-index="' + index + '" role="button" tabindex="0" ' +
        'aria-label="Open article: ' + escHtml(a.title) + '">' +
        '<div class="article-meta">' +
          '<span class="article-date">' + formatTime(a.publishedAt) + '</span>' +
          (a.source ? '<span class="article-category">' + escHtml(a.source) + '</span>' : '') +
        '</div>' +
        '<div class="article-title">' + escHtml(a.title) + '</div>' +
        (a.excerpt ? '<div class="article-why">' + escHtml(a.excerpt) + '</div>' : '') +
        '<div class="article-footer">' +
          '<span class="article-source">' + escHtml(a.source || '') + '</span>' +
          '<span class="article-read-indicator">Read →</span>' +
        '</div>' +
      '</div>'
    );
  }

  // ─── Render article cards (returns HTML string) ───
  function renderArticleCards(articles, variant) {
    if (!articles || !articles.length) return '';
    return articles.map(function (a, i) { return buildArticleCard(a, i, variant); }).join('');
  }

  // ─── Bind click / keyboard handlers for article cards ───
  function bindArticleCardEvents(container, articles, currentTopic, contentPrefix) {
    container.querySelectorAll('.article-card.clickable').forEach(function (card) {
      var idx = parseInt(card.getAttribute('data-index'), 10);
      var a = articles[idx];
      if (!a) return;
      function activate(e) {
        e.preventDefault();
        e.stopPropagation();
        openArticle(a, currentTopic, contentPrefix + '_' + (idx + 1));
      }
      card.addEventListener('click', activate);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') activate(e);
      });
    });
  }

  // ─── Widget open / close / restart ───
  function openWidget() {
    _isOpen = true;
    _widget.classList.add('open');
    _launcher.classList.add('hidden');
    _launcher.setAttribute('aria-expanded', 'true');
  }

  function closeWidget() {
    _isOpen = false;
    _widget.classList.remove('open');
    _launcher.classList.remove('hidden');
    _launcher.setAttribute('aria-expanded', 'false');
  }

  function restartWidget() {
    _currentQuery = '';
    _currentData = null;
    renderWelcomeScreen();
  }

  // ─── Screen state helper ───
  function showScreen(screenName) {
    var backBtn = document.getElementById('tp-back-btn');
    if (!backBtn) return;
    if (screenName === 'welcome') {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }
  }

  // ─── Welcome screen ───
  function renderWelcomeScreen() {
    var content = document.getElementById('tp-content');
    if (!content) return;

    content.innerHTML =
      '<div class="saarthi-screen">' +
        '<div class="bot-message">' +
          '<div class="bot-message-title">Welcome to Topic Pulse ⚡</div>' +
          '<p>Topic Pulse helps readers follow important developments across multiple related articles by grouping recent coverage into simple, source-linked topic updates. Ask what happened today in any topic, location, company, market, or event.</p>' +
        '</div>' +
        '<div class="search-container">' +
          '<input class="search-input" id="tp-search-input" type="text" ' +
            'placeholder="What happened today in RBI?" aria-label="Search topic" />' +
          '<button class="cta-button" id="tp-submit-btn">Search</button>' +
        '</div>' +
        '<button class="methodology-card" id="tp-methodology-card" type="button">' +
          '<span class="methodology-card-icon">🧠</span>' +
          '<span class="methodology-card-body">' +
            '<span class="methodology-card-title">How this product works</span>' +
            '<span class="methodology-card-subtitle">Simple 5-step methodology for demo explanation</span>' +
          '</span>' +
          '<span class="methodology-card-arrow">→</span>' +
        '</button>' +
        '<div class="section-heading">Today\'s Pulses</div>' +
        '<div class="option-buttons" id="tp-chips">' +
          '<div class="pulses-loading"><div class="spinner-sm"></div> Loading…</div>' +
        '</div>' +
      '</div>';

    showScreen('welcome');

    var input = document.getElementById('tp-search-input');
    document.getElementById('tp-submit-btn').addEventListener('click', function () {
      submitQuery(input.value.trim());
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitQuery(input.value.trim());
    });
    setTimeout(function () { if (input) input.focus(); }, 80);

    document.getElementById('tp-methodology-card').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      renderMethodologyScreen();
    });

    loadPulses();
  }

  // ─── Methodology screen ───
  function renderMethodologyScreen() {
    var content = document.getElementById('tp-content');
    if (!content) return;

    var stepsHtml = METHODOLOGY_STEPS.map(function (step, i) {
      return (
        '<div class="methodology-step">' +
          '<div class="methodology-step-number">' + (i + 1) + '</div>' +
          '<div class="methodology-step-card">' +
            '<div class="methodology-step-title">' + escHtml(step.title) + '</div>' +
            '<div class="methodology-step-text">' + escHtml(step.text) + '</div>' +
          '</div>' +
        '</div>' +
        (i < METHODOLOGY_STEPS.length - 1 ? '<div class="methodology-step-arrow">↓</div>' : '')
      );
    }).join('');

    content.innerHTML =
      '<div class="saarthi-screen">' +
        '<div class="bot-message">' +
          '<div class="bot-message-title">How It Works</div>' +
          '<p>Important updates are spread across multiple stories. Topic Pulse brings them together into one quick, clear view.</p>' +
        '</div>' +
        '<div class="methodology-steps">' + stepsHtml + '</div>' +
      '</div>';

    showScreen('methodology');
  }

  // ─── Load today's pulses ───
  function loadPulses() {
    var container = document.getElementById('tp-chips');
    if (!container) return;

    fetch(API_BASE + '/api/topic-pulse/pulses')
      .then(function (r) {
        if (!r.ok) throw new Error('API error ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var pulses = (data.pulses && data.pulses.length) ? data.pulses : FALLBACK_PULSES;
        renderPulseCards(container, pulses);
      })
      .catch(function () {
        renderPulseCards(container, FALLBACK_PULSES);
      });
  }

  function renderPulseCards(container, pulses) {
    container.innerHTML = pulses.map(function (p) {
      var emoji = p.emoji || getCategoryEmoji(p.category);
      return (
        '<button class="option-btn" data-topic="' + escHtml(p.query) + '">' +
          '<span class="option-btn-emoji">' + emoji + '</span>' +
          '<span class="option-btn-label">' + escHtml(p.label) + '</span>' +
          '<span class="option-btn-sublabel">' +
            p.articleCount + ' ' + (p.articleCount === 1 ? 'story' : 'stories') +
            ' · ' + escHtml(p.category) +
          '</span>' +
        '</button>'
      );
    }).join('');

    container.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        submitQuery(btn.getAttribute('data-topic'));
      });
    });
  }

  // ─── Submit query ───
  function submitQuery(query) {
    if (!query) return;
    _currentQuery = query;

    var content = document.getElementById('tp-content');
    if (!content) return;

    content.innerHTML =
      '<div class="saarthi-screen">' +
        '<div class="loading-container">' +
          '<div class="spinner"></div>' +
          '<p>Getting pulse on <em>' + escHtml(query) + '</em>…</p>' +
        '</div>' +
      '</div>';
    showScreen('loading');

    fetch(API_BASE + '/api/topic-pulse/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Server error ' + r.status);
        return r.json();
      })
      .then(function (data) {
        _currentData = data;
        renderResult(data);
      })
      .catch(function () {
        renderError('Could not fetch results. Please try again.');
      });
  }

  // ─── Key development helpers ───
  function renderKeyDevelopmentTabs(developments) {
    if (developments.length <= 1) return '';
    return (
      '<div class="key-dev-tabs">' +
      developments.map(function (d, i) {
        return '<button class="key-dev-tab' + (i === _selectedKeyDevIndex ? ' active' : '') +
          '" data-index="' + i + '">' + (i + 1) + '</button>';
      }).join('') +
      '</div>'
    );
  }

  function renderKeyDevelopmentPanel(developments, index) {
    var d = developments[index];
    if (!d) return '';
    return (
      '<div class="key-dev-item">' +
        '<p class="key-dev-text' + (_keyDevExpanded ? '' : ' collapsed') + '" id="tp-key-dev-text">' + escHtml(d.text) + '</p>' +
        '<button class="tp-read-more-btn" id="tp-key-dev-readmore">' + (_keyDevExpanded ? 'Show less' : 'Read more') + '</button>' +
      '</div>'
    );
  }

  function bindKeyDevelopmentEvents(developments, container) {
    container.querySelectorAll('.key-dev-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        _selectedKeyDevIndex = parseInt(tab.getAttribute('data-index'), 10);
        _keyDevExpanded = false;
        var panel = document.getElementById('tp-key-dev-panel');
        if (panel) {
          panel.innerHTML = renderKeyDevelopmentPanel(developments, _selectedKeyDevIndex);
          bindKeyDevReadMore(developments, container);
        }
        container.querySelectorAll('.key-dev-tab').forEach(function (t, i) {
          t.classList.toggle('active', i === _selectedKeyDevIndex);
        });
      });
    });
    bindKeyDevReadMore(developments, container);
  }

  function bindKeyDevReadMore(developments, container) {
    var btn = document.getElementById('tp-key-dev-readmore');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      _keyDevExpanded = !_keyDevExpanded;
      var textEl = document.getElementById('tp-key-dev-text');
      if (textEl) textEl.classList.toggle('collapsed', !_keyDevExpanded);
      btn.textContent = _keyDevExpanded ? 'Show less' : 'Read more';
    });
  }

  // ─── Render result screen ───
  function renderResult(data) {
    var content = document.getElementById('tp-content');
    if (!content) return;

    var conf = data.confidence || 'none';
    var confClass = 'confidence-' + conf;
    var confLabel = conf.charAt(0).toUpperCase() + conf.slice(1);
    var confPct = { high: '90', medium: '65', low: '35', none: '20' }[conf] || '20';

    var sourceModeLabel = data.sourceLabel || {
      'static-demo-cache':      'Recent fallback cache',
      'google-nlp-enriched':    'Recent fallback cache + Google NLP',
      'wordpress-api':          'WordPress REST API',
      'live-rss-feed':          'Live RSS feed',
      'hybrid-live-rss-cache':  'Live RSS + Recent cache',
    }[data.sourceMode] || (data.sourceMode || '');

    // Key developments
    _selectedKeyDevIndex = 0;
    _keyDevExpanded = false;
    var developments = data.keyDevelopments || [];
    var devHtml =
      '<div class="section-heading">Key Developments</div>' +
      (developments.length
        ? renderKeyDevelopmentTabs(developments) +
          '<div id="tp-key-dev-panel" class="key-dev-panel">' + renderKeyDevelopmentPanel(developments, 0) + '</div>'
        : '<div class="key-dev-empty">No key developments found for this topic yet.</div>');

    // Main articles (top 5 latest) + Related coverage (remaining, latest first).
    // Only real, clickable indianexpress.com article pages are ever shown as cards.
    var allArticles = (data.relatedArticles || [])
      .filter(function (a) { return isValidArticleUrl(a.url); })
      .sort(function (a, b) {
        var ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        var tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      });
    var mainArticles = allArticles.slice(0, 5);
    var restArticles = allArticles.slice(5);

    var mainArticlesHtml = renderArticleCards(mainArticles, 'main-article');
    var mainArticlesSection = mainArticlesHtml
      ? '<div class="section-heading">Main Articles</div><div class="main-articles-section" id="tp-main-article-list">' + mainArticlesHtml + '</div>'
      : '';

    var relatedHtml = renderArticleCards(restArticles, 'related-article');
    var relatedSection = relatedHtml
      ? '<div class="section-heading">Related Coverage</div><div class="related-articles-section" id="tp-article-list">' + relatedHtml + '</div>'
      : '';

    // Caveat
    var caveatHtml = data.caveat
      ? '<div class="caveat-block">' + escHtml(data.caveat) + '</div>'
      : '';

    // Follow-up buttons
    var followupHtml =
      '<div class="section-heading">Follow-up</div>' +
      '<div class="secondary-buttons" id="tp-followup-btns">' +
      FOLLOWUP_CHIPS.map(function (c) {
        return '<button class="secondary-button" data-action="' + escHtml(c.action) + '">' + escHtml(c.label) + '</button>';
      }).join('') +
      '</div>' +
      '<div id="tp-followup-note" class="hidden"></div>';

    // Feedback
    var feedbackHtml =
      '<div class="feedback-section" id="tp-feedback">' +
        '<div class="feedback-label">Was this useful?</div>' +
        '<div class="feedback-buttons">' +
          '<button class="feedback-btn feedback-btn-yes" id="tp-fb-yes">👍 Yes</button>' +
          '<button class="feedback-btn feedback-btn-no"  id="tp-fb-no">👎 No</button>' +
        '</div>' +
      '</div>';

    content.innerHTML =
      '<div class="saarthi-screen">' +
        '<div class="progress-container">' +
          '<div class="progress-header">' +
            '<span class="progress-text">What happened today in ' + escHtml(data.topic || _currentQuery) + '?</span>' +
            '<span class="confidence-badge ' + confClass + '">' + confLabel + '</span>' +
          '</div>' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + confPct + '%"></div></div>' +
          '<div class="progress-meta">' +
            '<span>📰 ' + (data.sourcesUsed || 0) + ' source' + ((data.sourcesUsed || 0) === 1 ? '' : 's') + '</span>' +
            '<span>🕐 ' + formatTime(data.lastUpdated) + '</span>' +
            (sourceModeLabel ? '<span>💾 Source: ' + escHtml(sourceModeLabel) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="bot-message">' +
          '<div class="bot-message-title">Quick Pulse</div>' +
          '<p class="quick-pulse-text collapsed" id="tp-quick-pulse-text">' + escHtml(data.summary) + '</p>' +
          '<button class="tp-read-more-btn" id="tp-quick-pulse-readmore">Read more</button>' +
        '</div>' +
        caveatHtml +
        mainArticlesSection +
        devHtml +
        relatedSection +
        followupHtml +
        feedbackHtml +
      '</div>';

    showScreen('result');

    var currentTopic = data.topic || _currentQuery;

    var mainArticleListEl = document.getElementById('tp-main-article-list');
    if (mainArticleListEl) bindArticleCardEvents(mainArticleListEl, mainArticles, currentTopic, 'main_article');

    var articleListEl = document.getElementById('tp-article-list');
    if (articleListEl) bindArticleCardEvents(articleListEl, restArticles, currentTopic, 'related_article');

    // Quick Pulse read-more handler
    var qpReadMoreBtn = document.getElementById('tp-quick-pulse-readmore');
    if (qpReadMoreBtn) {
      qpReadMoreBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        var textEl = document.getElementById('tp-quick-pulse-text');
        if (!textEl) return;
        var collapsed = textEl.classList.toggle('collapsed');
        qpReadMoreBtn.textContent = collapsed ? 'Read more' : 'Show less';
      });
    }

    // Key Developments tab + read-more handlers
    if (developments.length) {
      bindKeyDevelopmentEvents(developments, content);
    }

    // Follow-up button handlers
    content.querySelectorAll('.secondary-button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        var note = document.getElementById('tp-followup-note');

        if (action === 'sort-latest') {
          var sorted = restArticles.slice().sort(function (a, b) {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          });
          var listEl = document.getElementById('tp-article-list');
          if (listEl) {
            listEl.innerHTML = renderArticleCards(sorted, 'related-article');
            bindArticleCardEvents(listEl, sorted, currentTopic, 'related_article');
          }
          if (note) note.classList.add('hidden');

        } else if (action === 'scroll-articles') {
          var articleEl = document.getElementById('tp-article-list');
          if (articleEl) articleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (note) note.classList.add('hidden');

        } else if (action === 'explain-bg') {
          if (note) {
            note.className = 'followup-note';
            note.innerHTML = '📚 <strong>Background mode</strong> will be expanded when Claude API is connected. This version is limited to today\'s source-linked article cache.';
          }

        } else if (action === 'compare-yesterday') {
          if (note) {
            note.className = 'followup-note';
            note.innerHTML = '📅 <strong>Comparison mode</strong> will be added when historical cache is connected. Showing today\'s available source pulse.';
          }
        }
      });
    });

    document.getElementById('tp-fb-yes').onclick = function () { submitFeedback(true); };
    document.getElementById('tp-fb-no').onclick  = function () { submitFeedback(false); };
  }

  // ─── Render error screen ───
  function renderError(message) {
    var content = document.getElementById('tp-content');
    if (!content) return;

    content.innerHTML =
      '<div class="saarthi-screen">' +
        '<div class="error-container">' +
          '<span class="error-icon">⚠️</span>' +
          '<p class="error-message">' + escHtml(message) + '</p>' +
          '<button class="cta-button" id="tp-retry-btn" style="max-width:180px">Try Again</button>' +
        '</div>' +
      '</div>';

    showScreen('error');

    document.getElementById('tp-retry-btn').onclick = function () {
      if (_currentQuery) submitQuery(_currentQuery); else restartWidget();
    };
  }

  // ─── Submit feedback ───
  function submitFeedback(useful) {
    var fbArea = document.getElementById('tp-feedback');
    if (!fbArea) return;
    fbArea.innerHTML = '<span class="feedback-thanks">Thanks for your feedback!</span>';

    fetch(API_BASE + '/api/topic-pulse/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: _currentQuery,
        topic: _currentData ? _currentData.topic : _currentQuery,
        useful: useful,
        sourcesUsed: _currentData ? _currentData.sourcesUsed : 0,
      }),
    }).catch(function () { /* non-critical */ });
  }

  // ─── Build launcher ───
  function createLauncher() {
    var btn = document.createElement('button');
    btn.id = 'topic-pulse-toggle';
    btn.setAttribute('aria-label', 'Open Topic Pulse');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
      '</svg>';
    return btn;
  }

  // ─── Build widget shell ───
  function createWidgetDOM() {
    var div = document.createElement('div');
    div.id = 'topic-pulse-widget';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', 'Topic Pulse');
    div.innerHTML =
      '<div class="saarthi-header">' +
        '<div class="saarthi-header-left">' +
          '<button class="saarthi-header-back hidden" id="tp-back-btn" aria-label="Go back">' +
            '← Back' +
          '</button>' +
          '<span class="saarthi-header-icon">⚡</span>' +
          '<span class="saarthi-header-title">Topic Pulse</span>' +
        '</div>' +
        '<div class="saarthi-header-actions">' +
          '<button class="saarthi-header-btn" id="tp-restart-btn" title="Restart" aria-label="Restart">↺</button>' +
          '<button class="saarthi-header-btn" id="tp-close-btn" title="Close" aria-label="Close">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="saarthi-content" id="tp-content"></div>';
    return div;
  }

  // ─── Init ───
  function init() {
    var root = document.getElementById('topic-pulse-root') || document.body;

    _launcher = createLauncher();
    _widget   = createWidgetDOM();

    root.appendChild(_launcher);
    root.appendChild(_widget);

    // Swallow all clicks inside the widget — nothing inside should ever
    // bubble out and accidentally trigger a close handler on the document.
    _widget.addEventListener('click', function (e) { e.stopPropagation(); });

    document.getElementById('tp-back-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      restartWidget();
    });
    document.getElementById('tp-restart-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      restartWidget();
    });
    document.getElementById('tp-close-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      closeWidget();
    });

    renderWelcomeScreen();

    // Launcher opens widget; close is only via ✕ button or Escape key.
    _launcher.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!_isOpen) { openWidget(); }
    });

    // Escape key closes widget
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _isOpen) closeWidget();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
