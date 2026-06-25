(function () {
  'use strict';

  var API_BASE = (function () {
    if (typeof window !== 'undefined' && window.TOPIC_PULSE_API_BASE) {
      return window.TOPIC_PULSE_API_BASE;
    }
    return '';
  })();

  var FALLBACK_PULSES = [
    { label: 'RBI policy updates',   query: 'RBI',          articleCount: 3, category: 'Banking & Finance',  reason: 'Suggested' },
    { label: 'Stock market rally',   query: 'stock market', articleCount: 4, category: 'Markets & Economy',  reason: 'Suggested' },
    { label: 'Delhi heatwave alert', query: 'Delhi',        articleCount: 4, category: 'Cities & States',    reason: 'Suggested' },
    { label: 'Bihar by-elections',   query: 'elections',    articleCount: 2, category: 'Politics',           reason: 'Suggested' },
    { label: 'Gold import rules',    query: 'gold',         articleCount: 2, category: 'Commodities',        reason: 'Suggested' },
    { label: 'Monsoon alerts',       query: 'weather',      articleCount: 2, category: 'Weather & Climate',  reason: 'Suggested' },
    { label: 'Startup funding surge', query: 'startups',   articleCount: 3, category: 'Startups & Tech',    reason: 'Suggested' },
    { label: 'Parliament session',   query: 'parliament',   articleCount: 2, category: 'Politics & Law',     reason: 'Suggested' },
  ];

  var FOLLOWUP_CHIPS = [
    { label: 'Show latest only',              action: 'sort-latest' },
    { label: 'Related coverage',              action: 'scroll-articles' },
    { label: 'Explain background',            action: 'explain-bg' },
    { label: 'What changed since yesterday?', action: 'compare-yesterday' },
  ];

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isDemoUrl(url) {
    return !url || url.indexOf('example.com') !== -1;
  }

  function buildArticleCard(a) {
    var linkHtml;
    if (isDemoUrl(a.url)) {
      linkHtml = '<span class="tp-article-link tp-demo-link" data-demo-url="' + escHtml(a.url) + '">Read &rarr;</span>';
    } else {
      linkHtml = '<a class="tp-article-link" href="' + escHtml(a.url) + '" target="_blank" rel="noopener">Read &rarr;</a>';
    }
    return (
      '<div class="tp-article-card">' +
        '<div class="tp-article-title">' + escHtml(a.title) + '</div>' +
        '<div class="tp-article-excerpt">' + escHtml(a.excerpt) + '</div>' +
        '<div class="tp-article-meta">' +
          '<span class="tp-article-source">' + escHtml(a.source) + '</span>' +
          '<span class="tp-article-time">' + formatTime(a.publishedAt) + '</span>' +
          linkHtml +
        '</div>' +
      '</div>'
    );
  }

  function attachDemoLinkHandlers(container) {
    container.querySelectorAll('.tp-demo-link').forEach(function (el) {
      el.addEventListener('click', function () { showDemoToast(); });
    });
  }

  var _toastTimer = null;
  function showDemoToast() {
    var existing = document.getElementById('tp-demo-toast');
    if (existing) { clearTimeout(_toastTimer); existing.remove(); }
    var toast = document.createElement('div');
    toast.id = 'tp-demo-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:90px', 'right:24px', 'z-index:10001',
      'background:#333', 'color:#fff', 'font-size:12px', 'padding:10px 14px',
      'border-radius:8px', 'max-width:280px', 'line-height:1.5',
      'box-shadow:0 4px 14px rgba(0,0,0,0.25)', 'font-family:system-ui,sans-serif',
      'transition:opacity 0.3s',
    ].join(';');
    toast.textContent = 'Demo article link. Real article URLs will open after WordPress integration.';
    document.body.appendChild(toast);
    _toastTimer = setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
    }, 3500);
  }

  function createLauncher() {
    var btn = document.createElement('button');
    btn.id = 'tp-launcher';
    btn.setAttribute('aria-label', 'Open Topic Pulse');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="tp-pulse-dot"></span> Topic Pulse';
    return btn;
  }

  function createWidget() {
    var div = document.createElement('div');
    div.id = 'tp-widget';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', 'Topic Pulse');
    return div;
  }

  function renderPulseCards(container, pulses, sectionLabel) {
    var labelEl = document.getElementById('tp-pulses-label');
    if (labelEl) labelEl.textContent = sectionLabel;

    container.innerHTML = pulses.map(function (p) {
      return (
        '<button class="tp-pulse-card" data-topic="' + escHtml(p.query) + '">' +
          '<div class="tp-pulse-card-label">' + escHtml(p.label) + '</div>' +
          '<div class="tp-pulse-card-meta">' +
            p.articleCount + ' ' + (p.articleCount === 1 ? 'story' : 'stories') +
            ' &middot; ' + escHtml(p.category) +
          '</div>' +
        '</button>'
      );
    }).join('');

    container.querySelectorAll('.tp-pulse-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var input = document.getElementById('tp-search-input');
        if (input) input.value = card.getAttribute('data-topic');
        submitQuery();
      });
    });
  }

  function loadPulses() {
    var container = document.getElementById('tp-chips');
    if (!container) return;

    fetch(API_BASE + '/api/topic-pulse/pulses')
      .then(function (r) {
        if (!r.ok) throw new Error('API error ' + r.status);
        return r.json();
      })
      .then(function (data) {
        renderPulseCards(container, data.pulses && data.pulses.length ? data.pulses : FALLBACK_PULSES, "Today's Pulses");
      })
      .catch(function () {
        renderPulseCards(container, FALLBACK_PULSES, 'Suggested');
      });
  }

  function renderHome(widget, query) {
    widget.innerHTML =
      '<div class="tp-header">' +
        '<div class="tp-header-left">' +
          '<span class="tp-logo-badge">AI</span>' +
          '<span class="tp-header-title">Topic Pulse</span>' +
        '</div>' +
        '<button class="tp-close-btn" id="tp-close-btn" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="tp-body">' +
        '<p class="tp-subtitle">Ask what happened today in any topic, location, company, market, or event.</p>' +
        '<div class="tp-search-wrap">' +
          '<input class="tp-search-input" id="tp-search-input" type="text" placeholder="What happened today in…" value="' + escHtml(query || '') + '" aria-label="Search topic" />' +
          '<button class="tp-submit-btn" id="tp-submit-btn">Get Pulse</button>' +
        '</div>' +
        '<div class="tp-chips-label" id="tp-pulses-label">Today\'s Pulses</div>' +
        '<div class="tp-pulse-cards-grid" id="tp-chips">' +
          '<div class="tp-pulses-loading"><div class="tp-spinner-sm"></div> Loading…</div>' +
        '</div>' +
      '</div>';

    document.getElementById('tp-close-btn').onclick = function () { closeWidget(); };
    document.getElementById('tp-submit-btn').onclick = function () { submitQuery(); };
    var input = document.getElementById('tp-search-input');
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitQuery(); });
    if (!query) { setTimeout(function () { input.focus(); }, 80); }

    loadPulses();
  }

  function renderLoading(widget, query) {
    var body = widget.querySelector('.tp-body');
    if (!body) return;
    body.innerHTML =
      '<button class="tp-back-btn" id="tp-back-btn">&#8592; New Search</button>' +
      '<div class="tp-loading"><div class="tp-spinner"></div> Getting pulse on <em>' + escHtml(query) + '</em>&hellip;</div>';
    document.getElementById('tp-back-btn').onclick = function () { renderHome(widget, query); };
  }

  function buildResultHtml(data, articlesToShow) {
    var confClass = 'tp-confidence-' + (data.confidence || 'none');
    var confLabel = (data.confidence || 'none').charAt(0).toUpperCase() + (data.confidence || 'none').slice(1) + ' Confidence';

    var sourceModeLabel = {
      'static-demo-cache':    'Demo article cache',
      'google-nlp-enriched':  'Google NLP enriched',
      'wordpress-api':        'WordPress live feed',
    }[data.sourceMode] || data.sourceMode;

    var devHtml = '';
    if (data.keyDevelopments && data.keyDevelopments.length) {
      devHtml =
        '<div class="tp-section-label">Key Developments</div>' +
        '<ul class="tp-dev-list">' +
        data.keyDevelopments.map(function (d) {
          var linkPart;
          if (isDemoUrl(d.sourceUrl)) {
            linkPart = '<span class="tp-dev-source tp-demo-link" data-demo-url="' + escHtml(d.sourceUrl) + '">' + escHtml(d.sourceTitle) + ' &rarr;</span>';
          } else {
            linkPart = '<a class="tp-dev-source" href="' + escHtml(d.sourceUrl) + '" target="_blank" rel="noopener">' + escHtml(d.sourceTitle) + ' &rarr;</a>';
          }
          return '<li class="tp-dev-item">' + escHtml(d.text) + '<br>' + linkPart + '</li>';
        }).join('') +
        '</ul>';
    }

    var articlesHtml = '';
    if (articlesToShow && articlesToShow.length) {
      articlesHtml =
        '<div class="tp-section-label" id="tp-related-label">Related Coverage</div>' +
        '<div id="tp-article-list">' +
        articlesToShow.map(function (a) { return buildArticleCard(a); }).join('') +
        '</div>';
    }

    var caveatHtml = data.caveat ? '<div class="tp-caveat">' + escHtml(data.caveat) + '</div>' : '';

    var followupHtml =
      '<div class="tp-section-label">Follow-up</div>' +
      '<div class="tp-followup-chips" id="tp-followup-chips">' +
      FOLLOWUP_CHIPS.map(function (c) {
        return '<button class="tp-followup-chip" data-action="' + escHtml(c.action) + '">' + escHtml(c.label) + '</button>';
      }).join('') +
      '</div>' +
      '<div id="tp-followup-note" style="display:none;"></div>';

    var feedbackHtml =
      '<div class="tp-feedback" id="tp-feedback">' +
        '<div class="tp-feedback-label">Was this useful?</div>' +
        '<div class="tp-feedback-btns">' +
          '<button class="tp-feedback-btn tp-feedback-yes" id="tp-fb-yes">Yes</button>' +
          '<button class="tp-feedback-btn tp-feedback-no" id="tp-fb-no">No</button>' +
        '</div>' +
      '</div>';

    return (
      '<button class="tp-back-btn" id="tp-back-btn">&#8592; New Search</button>' +
      '<h2 class="tp-result-topic">What happened today in ' + escHtml(data.topic) + '?</h2>' +
      '<span class="tp-confidence-badge ' + confClass + '">' + confLabel + '</span>' +
      '<div class="tp-section-label">Quick Pulse</div>' +
      '<p class="tp-summary">' + escHtml(data.summary) + '</p>' +
      caveatHtml +
      devHtml +
      articlesHtml +
      '<div class="tp-result-meta">' +
        '<span>&#128240; ' + (data.sourcesUsed || 0) + ' sources</span>' +
        '<span>&#128337; ' + formatTime(data.lastUpdated) + '</span>' +
        '<span>&#128190; ' + escHtml(sourceModeLabel) + '</span>' +
      '</div>' +
      followupHtml +
      feedbackHtml
    );
  }

  function renderResult(widget, data, originalQuery) {
    var body = widget.querySelector('.tp-body');
    body.innerHTML = buildResultHtml(data, data.relatedArticles);

    attachDemoLinkHandlers(body);

    document.getElementById('tp-back-btn').onclick = function () { renderHome(widget, originalQuery); };

    body.querySelectorAll('.tp-followup-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var action = chip.getAttribute('data-action');
        var note = document.getElementById('tp-followup-note');

        if (action === 'sort-latest') {
          var sorted = (data.relatedArticles || []).slice().sort(function (a, b) {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          });
          var listEl = document.getElementById('tp-article-list');
          var labelEl = document.getElementById('tp-related-label');
          if (listEl) {
            listEl.innerHTML = sorted.map(function (a) { return buildArticleCard(a); }).join('');
            attachDemoLinkHandlers(listEl);
          }
          if (labelEl) labelEl.textContent = 'Related Coverage (Latest First)';
          if (note) note.style.display = 'none';

        } else if (action === 'scroll-articles') {
          var articleSection = document.getElementById('tp-related-label');
          if (articleSection) articleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (note) note.style.display = 'none';

        } else if (action === 'explain-bg') {
          if (note) {
            note.style.display = 'block';
            note.className = 'tp-followup-note-box';
            note.innerHTML = '&#128218; <strong>Background mode</strong> will be expanded when Claude API is connected. This version is limited to today\'s source-linked article cache.';
          }

        } else if (action === 'compare-yesterday') {
          if (note) {
            note.style.display = 'block';
            note.className = 'tp-followup-note-box';
            note.innerHTML = '&#128197; <strong>Comparison mode</strong> will be added when historical cache is connected. Showing today\'s available source pulse.';
          }
        }
      });
    });

    document.getElementById('tp-fb-yes').onclick = function () { sendFeedback(originalQuery, data, true); };
    document.getElementById('tp-fb-no').onclick = function () { sendFeedback(originalQuery, data, false); };
  }

  function renderError(widget, message, query) {
    var body = widget.querySelector('.tp-body');
    body.innerHTML =
      '<button class="tp-back-btn" id="tp-back-btn">&#8592; New Search</button>' +
      '<div style="padding:16px 0;color:#c62828;font-size:14px;">' + escHtml(message) + '</div>';
    document.getElementById('tp-back-btn').onclick = function () { renderHome(widget, query); };
  }

  var _widget = null;
  var _launcher = null;
  var _isOpen = false;

  function openWidget() {
    _isOpen = true;
    _widget.classList.add('tp-open');
    _launcher.setAttribute('aria-expanded', 'true');
  }

  function closeWidget() {
    _isOpen = false;
    _widget.classList.remove('tp-open');
    _launcher.setAttribute('aria-expanded', 'false');
  }

  function submitQuery() {
    var input = document.getElementById('tp-search-input');
    if (!input) return;
    var query = input.value.trim();
    if (!query) return;

    var submitBtn = document.getElementById('tp-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    renderLoading(_widget, query);

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
        renderResult(_widget, data, query);
      })
      .catch(function (err) {
        renderError(_widget, 'Could not fetch results. Please try again.', query);
      });
  }

  function sendFeedback(query, data, useful) {
    var fbArea = document.getElementById('tp-feedback');
    if (!fbArea) return;
    fbArea.innerHTML = '<span class="tp-feedback-thanks">Thanks for your feedback!</span>';

    fetch(API_BASE + '/api/topic-pulse/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, topic: data.topic, useful: useful, sourcesUsed: data.sourcesUsed }),
    }).catch(function () { /* non-critical */ });
  }

  function init() {
    var root = document.getElementById('topic-pulse-root') || document.body;

    _launcher = createLauncher();
    _widget = createWidget();

    root.appendChild(_launcher);
    root.appendChild(_widget);

    renderHome(_widget, '');

    _launcher.addEventListener('click', function () {
      if (_isOpen) { closeWidget(); } else { openWidget(); }
    });

    document.addEventListener('click', function (e) {
      if (_isOpen && !_widget.contains(e.target) && e.target !== _launcher) {
        closeWidget();
      }
    });

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
