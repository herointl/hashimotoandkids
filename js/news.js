/* =========================================================
   お知らせ一覧・トップ新着（data/news.json を読み込む）
   APIキーはここには置きません。JSON は GitHub Actions が生成します。
   ========================================================= */
(function () {
  'use strict';

  var lists = document.querySelectorAll('[data-news-list]');
  if (!lists.length) return;

  var FALLBACK = '現在お知らせを取得できません';
  var EMPTY = '現在お知らせはありません';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = String(iso).slice(0, 10).replace(/-/g, '.');
    return d;
  }

  function catClass(name) {
    var map = {
      '空き状況': 'g',
      '行事': 'g',
      'イベント': 'g',
      '活動報告': 'g',
      '重要': 'b',
      '重要なお知らせ': 'b'
    };
    return map[name] || '';
  }

  function itemHtml(item, withExcerpt) {
    var href = item.url || ('news/' + encodeURIComponent(item.slug) + '/');
    var cls = item.categoryClass || catClass(item.category);
    var catCls = cls ? 'news-cat ' + cls : 'news-cat';
    var excerpt = '';
    if (withExcerpt && item.description) {
      excerpt = '<span class="news-excerpt">' + escapeHtml(item.description) + '</span>';
    }
    return (
      '<li><a href="' + escapeHtml(href) + '">' +
        '<time class="news-date" datetime="' + escapeHtml(item.date || '') + '">' +
          escapeHtml(formatDate(item.date)) +
        '</time>' +
        '<span class="' + escapeHtml(catCls) + '">' + escapeHtml(item.category || 'お知らせ') + '</span>' +
        '<span class="news-ttl">' + escapeHtml(item.title || '') + '</span>' +
        excerpt +
      '</a></li>'
    );
  }

  function setMessage(list, text) {
    list.innerHTML = '<li class="news-fallback" role="status">' + escapeHtml(text) + '</li>';
  }

  function reveal(el) {
    el.classList.add('in');
    el.style.transitionDelay = '0ms';
  }

  function render(list, items) {
    var limit = parseInt(list.getAttribute('data-news-limit') || '', 10);
    var withExcerpt = list.getAttribute('data-news-excerpt') === 'true';
    var sliced = Array.isArray(items) ? items.slice() : [];
    if (limit > 0) sliced = sliced.slice(0, limit);
    if (!sliced.length) {
      setMessage(list, EMPTY);
      reveal(list);
      return;
    }
    list.innerHTML = sliced.map(function (item) {
      return itemHtml(item, withExcerpt);
    }).join('');
    reveal(list);
  }

  var src = lists[0].getAttribute('data-news-src') || 'data/news.json';

  fetch(src, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('news json ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var items = Array.isArray(data) ? data : (data && data.items) || [];
      lists.forEach(function (list) { render(list, items); });
    })
    .catch(function () {
      lists.forEach(function (list) {
        setMessage(list, FALLBACK);
        reveal(list);
      });
    });
})();
