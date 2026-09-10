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

  /* --- お問い合わせフォーム送信（FormSubmit の AJAX エンドポイントを利用） --- */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    // 送信先。フォームの action 属性（https://formsubmit.co/<メールアドレス>）から AJAX 用 URL を組み立てる。
    // 有効化後に FormSubmit から発行されるランダム文字列のエンドポイントに差し替える場合は、
    // contact.html の action 属性を https://formsubmit.co/<ランダム文字列> に変更してください。
    var endpoint = form.getAttribute('action').replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');

    var msg = form.querySelector('[data-form-msg]');
    var btn = form.querySelector('[data-submit-btn]');
    var btnLabel = form.querySelector('[data-submit-label]');
    var defaultLabel = btnLabel ? btnLabel.textContent : '';

    var TEXT = {
      ok: '<strong>送信が完了しました。</strong><br>お問い合わせありがとうございます。担当者より順次ご連絡いたします。<br>お急ぎの場合はお電話（<a href="tel:0428163228">042-816-3228</a>）でもお気軽にご連絡ください。',
      error: '<strong>送信に失敗しました。</strong><br>お手数ですが、時間をおいて再度お試しいただくか、お電話（<a href="tel:0428163228">042-816-3228</a>）または<a href="mailto:hashimoto@andkids.jp">メール</a>にてご連絡ください。'
    };

    var showMsg = function (type, html) {
      if (!msg) { return; }
      msg.className = 'note form-msg is-' + type;
      msg.innerHTML = html;
      msg.hidden = false;
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    var setSending = function (sending) {
      if (btn) { btn.disabled = sending; }
      if (btnLabel) { btnLabel.textContent = sending ? '送信中…' : defaultLabel; }
    };

    // JS 無効時のフォールバック送信後に ?sent=1 で戻ってきた場合は完了メッセージを表示
    if (/[?&]sent=1(&|$)/.test(window.location.search)) {
      showMsg('ok', TEXT.ok);
    }

    // ラベル名をそのままメール本文の項目名にする（FormSubmit は送信キーをそのまま表示するため）
    var LABELS = {
      name: 'お名前',
      tel: '電話番号',
      email: 'メールアドレス',
      age: 'お子さまの年齢',
      purpose: 'ご希望内容',
      message: '備考・ご質問'
    };

    var buildPayload = function () {
      var fd = new FormData(form);
      var payload = {};
      Object.keys(LABELS).forEach(function (key) {
        var v = fd.get(key);
        payload[LABELS[key]] = v ? String(v).trim() : '（未入力）';
      });
      // FormSubmit 用の制御フィールド（_subject, _cc, _template, _honey など）をそのまま引き継ぐ
      fd.forEach(function (v, k) {
        if (k.charAt(0) === '_' && k !== '_next' && k !== '_captcha') { payload[k] = v; }
      });
      var email = fd.get('email');
      if (email && String(email).trim()) { payload._replyto = String(email).trim(); }
      payload['送信元ページ'] = window.location.href.split('?')[0];
      return payload;
    };

    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData) { return; } // 古いブラウザは通常のフォーム送信にフォールバック
      e.preventDefault();
      if (msg) { msg.hidden = true; }
      setSending(true);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(buildPayload())
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (r) {
          var success = r.data && (r.data.success === true || r.data.success === 'true');
          if (!r.ok || !success) { throw new Error((r.data && r.data.message) || 'send failed'); }
          form.reset();
          showMsg('ok', TEXT.ok);
        })
        .catch(function () {
          showMsg('error', TEXT.error);
        })
        .then(function () { setSending(false); });
    });
  }
})();
