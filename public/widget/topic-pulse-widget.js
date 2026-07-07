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

  function formatDateShort(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (e) { return String(iso || ''); }
  }

  // ~200 wpm reading estimate from excerpt/content
  function estimateReadMinutes(a) {
    var text = (a && (a.content || a.excerpt)) || '';
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / 200));
  }

  function estimateTotalReadMinutes(articles) {
    if (!articles || !articles.length) return 0;
    var total = articles.reduce(function (sum, a) { return sum + estimateReadMinutes(a); }, 0);
    return Math.max(1, total);
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
  var _currentClusterId = null;
  var _currentData = null;
  var _quickPulseExpanded = false;
  // topic (string) -> Set of read article URLs, session-only, reset on page refresh
  var _readProgress = {};
  var _articleClickCount = 0;
  var _feedbackUseful = null;

  var REGISTRATION_LS_KEY = 'tp_registered';
  var REGISTRATION_TRIGGER_COUNT = 4;

  function getReadSet(topic) {
    var key = topic || '';
    if (!_readProgress[key]) _readProgress[key] = {};
    return _readProgress[key];
  }

  function getReadCount(topic, totalArticles) {
    var set = getReadSet(topic);
    var count = 0;
    for (var i = 0; i < totalArticles.length; i++) {
      if (set[totalArticles[i].url]) count++;
    }
    return count;
  }

  // ─── Article card (UPSC-style) ───
  function buildArticleCard(a, index, variant) {
    var cardClass = variant === 'main-article' ? 'article-card-main' : 'related-card-secondary';
    return (
      '<div class="article-card clickable ' + cardClass + '" data-index="' + index + '" role="button" tabindex="0" ' +
        'aria-label="Open article: ' + escHtml(a.title) + '">' +
        '<div class="article-card-meta">' +
          '<span class="article-date">' + formatDateShort(a.publishedAt) + '</span>' +
          (a.category ? '<span class="article-category-pill">' + escHtml(a.category) + '</span>' : '') +
          '<span class="article-read-time">⏱ ' + estimateReadMinutes(a) + ' min</span>' +
        '</div>' +
        '<div class="article-title">' + escHtml(a.title) + '</div>' +
        (a.excerpt ? '<div class="article-excerpt">' + escHtml(a.excerpt) + '</div>' : '') +
        '<button type="button" class="article-cta article-cta-gradient" tabindex="-1">Read Article →</button>' +
      '</div>'
    );
  }

  // ─── Render article cards (returns HTML string) ───
  function renderArticleCards(articles, variant) {
    if (!articles || !articles.length) return '';
    return articles.map(function (a, i) { return buildArticleCard(a, i, variant); }).join('');
  }

  // ─── Bind click / keyboard handlers for article cards ───
  function bindArticleCardEvents(container, articles, currentTopic, contentPrefix, onRead) {
    container.querySelectorAll('.article-card.clickable').forEach(function (card) {
      var idx = parseInt(card.getAttribute('data-index'), 10);
      var a = articles[idx];
      if (!a) return;
      function activate(e) {
        e.preventDefault();
        e.stopPropagation();
        openArticle(a, currentTopic, contentPrefix + '_' + (idx + 1));
        getReadSet(currentTopic)[a.url] = true;
        if (onRead) onRead();
        _articleClickCount++;
        if (_articleClickCount === REGISTRATION_TRIGGER_COUNT && !isRegistered()) {
          showRegistrationModal();
        }
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
    _currentClusterId = null;
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
          '<div class="bot-message-title">Topic Pulse</div>' +
          '<p>Ask what happened today in any topic, location, company, market, or event.</p>' +
        '</div>' +
        '<div class="search-container">' +
          '<input class="search-input" id="tp-search-input" type="text" ' +
            'placeholder="What happened today in RBI?" aria-label="Search topic" />' +
          '<button class="cta-button" id="tp-submit-btn">Search</button>' +
        '</div>' +
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

    loadPulses();
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
        '<button class="option-btn" data-topic="' + escHtml(p.query) + '" data-cluster-id="' + escHtml(p.clusterId || '') + '">' +
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
        submitQuery(btn.getAttribute('data-topic'), btn.getAttribute('data-cluster-id') || null);
      });
    });
  }

  // ─── Submit query ───
  // clusterId, when present (a Today's Pulse card click), makes the query API
  // reuse the exact same cluster-matching rule the pulse card's count was built
  // from — so the result screen can never show a different article count than
  // the card promised.
  function submitQuery(query, clusterId) {
    if (!query) return;
    _currentQuery = query;
    _currentClusterId = clusterId || null;

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
      body: JSON.stringify({ query: query, clusterId: _currentClusterId }),
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

  // ─── Topic summary panel (upper area) ───
  var TOPIC_SUMMARY_EXPLANATION =
    'Topic Pulse groups recent related stories into one quick view so readers can follow the full development without searching across sections.';

  function buildTopicSummaryPanel(topic, totalCount, mainArticles, sourceLabel, topicSignalLabel) {
    var readCount = getReadCount(topic, mainArticles);
    var totalMinutes = estimateTotalReadMinutes(mainArticles);
    var pct = mainArticles.length ? Math.round((readCount / mainArticles.length) * 100) : 0;

    return (
      '<div class="topic-summary-panel">' +
        '<div class="topic-summary-accent"></div>' +
        '<div class="topic-summary-body">' +
          '<div class="topic-summary-title">' + escHtml(topic) + '</div>' +
          '<div class="topic-summary-count">' + totalCount + ' article' + (totalCount === 1 ? '' : 's') + ' available</div>' +
          '<div class="topic-progress-row">' +
            '<span id="tp-progress-count-text">' + readCount + '/' + mainArticles.length + ' articles read</span>' +
            '<span class="topic-progress-time">' + totalMinutes + ' min</span>' +
          '</div>' +
          '<div class="topic-progress-bar"><div class="topic-progress-fill" id="tp-progress-fill-bar" style="width:' + pct + '%"></div></div>' +
          '<div class="topic-signal-row">' +
            (sourceLabel ? '<span class="topic-source-pill">Source: ' + escHtml(sourceLabel) + '</span>' : '') +
            (topicSignalLabel ? '<span class="topic-signal-pill">Topic signal: ' + escHtml(topicSignalLabel) + '</span>' : '') +
          '</div>' +
          '<p class="topic-summary-desc">' + escHtml(TOPIC_SUMMARY_EXPLANATION) + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  // ─── Quick Pulse (secondary, article-backed topic summary) ───
  function buildQuickPulseSection(summaryText) {
    if (!summaryText) return '';
    return (
      '<div class="quick-pulse-section">' +
        '<div class="section-heading quick-pulse-heading">Quick Pulse</div>' +
        '<p class="quick-pulse-text' + (_quickPulseExpanded ? '' : ' collapsed') + '" id="tp-quick-pulse-text">' + escHtml(summaryText) + '</p>' +
        '<button class="tp-read-more-btn" id="tp-quick-pulse-readmore" type="button">' + (_quickPulseExpanded ? 'Show less' : 'Read more') + '</button>' +
      '</div>'
    );
  }

  function bindQuickPulseEvents() {
    var btn = document.getElementById('tp-quick-pulse-readmore');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      _quickPulseExpanded = !_quickPulseExpanded;
      var textEl = document.getElementById('tp-quick-pulse-text');
      if (textEl) textEl.classList.toggle('collapsed', !_quickPulseExpanded);
      btn.textContent = _quickPulseExpanded ? 'Show less' : 'Read more';
    });
  }

  function updateProgressUI(topic, mainArticles) {
    var readCount = getReadCount(topic, mainArticles);
    var pct = mainArticles.length ? Math.round((readCount / mainArticles.length) * 100) : 0;
    var textEl = document.getElementById('tp-progress-count-text');
    var fillEl = document.getElementById('tp-progress-fill-bar');
    if (textEl) textEl.textContent = readCount + '/' + mainArticles.length + ' articles read';
    if (fillEl) fillEl.style.width = pct + '%';
  }

  // ─── Render result screen ───
  // Order: topic summary panel -> Main Articles -> Quick Pulse (secondary) ->
  // Related Coverage (only if extra articles exist) -> Feedback.
  // Key Developments is intentionally not rendered here (removed from widget UI).
  function renderResult(data) {
    var content = document.getElementById('tp-content');
    if (!content) return;

    _quickPulseExpanded = false;

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
      ? '<div class="section-heading">Main Articles</div><div class="article-list-section" id="tp-main-article-list">' + mainArticlesHtml + '</div>'
      : '';

    var relatedHtml = renderArticleCards(restArticles, 'related-article');
    var relatedSection = relatedHtml
      ? '<div class="section-heading">Related Coverage</div><div class="article-list-section" id="tp-article-list">' + relatedHtml + '</div>'
      : '';

    var currentTopic = data.topic || _currentQuery;
    var summaryPanelHtml = buildTopicSummaryPanel(
      currentTopic, allArticles.length, mainArticles, data.sourceLabel, data.topicSignalLabel
    );
    var quickPulseHtml = buildQuickPulseSection(data.summary);

    // Feedback
    _feedbackUseful = null;
    var feedbackHtml =
      '<div class="feedback-section" id="tp-feedback">' +
        '<div class="feedback-label">Was this useful?</div>' +
        '<div class="feedback-buttons">' +
          '<button class="feedback-btn feedback-btn-yes" id="tp-fb-yes" type="button">👍 Yes</button>' +
          '<button class="feedback-btn feedback-btn-no"  id="tp-fb-no" type="button">👎 No</button>' +
        '</div>' +
        '<textarea class="feedback-textarea" id="tp-fb-comment" placeholder="Any suggestion? (optional)" rows="2"></textarea>' +
        '<button class="cta-button feedback-submit-btn" id="tp-fb-submit" type="button" disabled>Submit Feedback</button>' +
      '</div>';

    content.innerHTML =
      '<div class="saarthi-screen">' +
        summaryPanelHtml +
        mainArticlesSection +
        quickPulseHtml +
        relatedSection +
        feedbackHtml +
      '</div>';

    showScreen('result');

    var onRead = function () { updateProgressUI(currentTopic, mainArticles); };

    var mainArticleListEl = document.getElementById('tp-main-article-list');
    if (mainArticleListEl) bindArticleCardEvents(mainArticleListEl, mainArticles, currentTopic, 'main_article', onRead);

    var articleListEl = document.getElementById('tp-article-list');
    if (articleListEl) bindArticleCardEvents(articleListEl, restArticles, currentTopic, 'related_article', onRead);

    bindQuickPulseEvents();
    bindFeedbackEvents();
  }

  // ─── Feedback form ───
  function bindFeedbackEvents() {
    var yesBtn = document.getElementById('tp-fb-yes');
    var noBtn = document.getElementById('tp-fb-no');
    var submitBtn = document.getElementById('tp-fb-submit');
    if (!yesBtn || !noBtn || !submitBtn) return;

    function selectUseful(value) {
      _feedbackUseful = value;
      yesBtn.classList.toggle('active', value === true);
      noBtn.classList.toggle('active', value === false);
      submitBtn.disabled = false;
    }

    yesBtn.addEventListener('click', function () { selectUseful(true); });
    noBtn.addEventListener('click', function () { selectUseful(false); });
    submitBtn.addEventListener('click', function () {
      if (_feedbackUseful === null) return;
      var commentEl = document.getElementById('tp-fb-comment');
      submitFeedback(_feedbackUseful, commentEl ? commentEl.value.trim() : '');
    });
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
      if (_currentQuery) submitQuery(_currentQuery, _currentClusterId); else restartWidget();
    };
  }

  // ─── Submit feedback ───
  function submitFeedback(useful, comment) {
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
        comment: comment || '',
        sourcesUsed: _currentData ? _currentData.sourcesUsed : 0,
      }),
    }).catch(function () { /* non-critical */ });
  }

  // ─── Registration popup (shown after 4th real article click) ───
  function isRegistered() {
    try {
      return window.localStorage.getItem(REGISTRATION_LS_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markRegistered() {
    try {
      window.localStorage.setItem(REGISTRATION_LS_KEY, '1');
    } catch (e) { /* ignore */ }
  }

  function closeRegistrationModal() {
    var overlay = document.getElementById('tp-registration-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function showRegistrationModal() {
    if (document.getElementById('tp-registration-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'tp-registration-overlay';
    overlay.className = 'tp-modal-overlay';
    overlay.innerHTML =
      '<div class="tp-modal-card" role="dialog" aria-label="Register to continue">' +
        '<button class="tp-modal-close" id="tp-reg-close" type="button" aria-label="Close">✕</button>' +
        '<div class="tp-modal-title">Stay in the loop ⚡</div>' +
        '<p class="tp-modal-subtitle">Register to keep following Topic Pulse updates.</p>' +
        '<div class="tp-modal-field">' +
          '<label for="tp-reg-name">Name</label>' +
          '<input type="text" id="tp-reg-name" placeholder="Your name" required />' +
        '</div>' +
        '<div class="tp-modal-field">' +
          '<label for="tp-reg-email">Email</label>' +
          '<input type="email" id="tp-reg-email" placeholder="you@example.com" required />' +
        '</div>' +
        '<div class="tp-modal-field">' +
          '<label for="tp-reg-mobile">Mobile</label>' +
          '<input type="tel" id="tp-reg-mobile" placeholder="10-digit mobile number" required />' +
        '</div>' +
        '<div class="tp-modal-error hidden" id="tp-reg-error">Please fill in all fields correctly.</div>' +
        '<button class="cta-button" id="tp-reg-submit" type="button">Register</button>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('tp-reg-close').addEventListener('click', closeRegistrationModal);

    document.getElementById('tp-reg-submit').addEventListener('click', function () {
      var name = document.getElementById('tp-reg-name').value.trim();
      var email = document.getElementById('tp-reg-email').value.trim();
      var mobile = document.getElementById('tp-reg-mobile').value.trim();
      var errorEl = document.getElementById('tp-reg-error');

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      var mobileOk = /^\d{10}$/.test(mobile.replace(/\D/g, ''));

      if (!name || !emailOk || !mobileOk) {
        if (errorEl) errorEl.classList.remove('hidden');
        return;
      }
      if (errorEl) errorEl.classList.add('hidden');

      submitRegistration({ name: name, email: email, mobile: mobile });
    });
  }

  function submitRegistration(fields) {
    var payload = {
      name: fields.name,
      email: fields.email,
      mobile: fields.mobile,
      query: _currentQuery,
      topic: _currentData ? _currentData.topic : _currentQuery,
      timestamp: new Date().toISOString(),
    };

    function finish() {
      markRegistered();
      var card = document.querySelector('#tp-registration-overlay .tp-modal-card');
      if (card) {
        card.innerHTML = '<div class="tp-modal-thanks">Thanks, registration saved for demo 🙌</div>';
      }
      setTimeout(closeRegistrationModal, 1200);
    }

    fetch(API_BASE + '/api/topic-pulse/registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function () { finish(); })
      .catch(function () { finish(); });
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
