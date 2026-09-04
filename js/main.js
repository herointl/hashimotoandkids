/* =========================================================
   こども発達らぼ ＆kids橋本 / main.js
   ========================================================= */
(function () {
  'use strict';

  /* --- ヘッダーの高さを CSS 変数に反映（モバイルメニューの開始位置に使用） --- */
  var header = document.querySelector('.site-header');
  if (header) {
    var setHeaderH = function () {
      document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
    };
    setHeaderH();
    window.addEventListener('resize', setHeaderH);
    window.addEventListener('load', setHeaderH);
  }

  /* --- モバイルナビ開閉 --- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });
    // ナビ内リンクをタップしたら閉じる
    document.querySelectorAll('.gnav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    // Esc で閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* --- スクロールで要素をふわっと表示 --- */
  var targets = document.querySelectorAll('.rv');
  if (targets.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      targets.forEach(function (el, i) {
        el.style.transitionDelay = (Math.min(i % 4, 3) * 90) + 'ms';
        io.observe(el);
      });
    } else {
      targets.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* --- フッターの西暦を自動更新 --- */
  var y = document.querySelector('[data-year]');
  if (y) { y.textContent = new Date().getFullYear(); }

  /* --- 送信デモ（WordPress 実装時は Contact Form 7 等に置き換え） --- */
  var form = document.querySelector('[data-demo-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('[data-form-msg]');
      if (msg) {
        msg.hidden = false;
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
