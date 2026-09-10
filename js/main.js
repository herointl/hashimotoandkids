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

  /* --- お問い合わせフォーム（Google Apps Script へ送信） --- */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var gasUrl = (form.getAttribute('data-gas-url') || '').trim();
    var msg = form.querySelector('[data-form-msg]');
    var btn = form.querySelector('[data-submit-btn]');
    var btnLabel = form.querySelector('[data-submit-label]');
    var defaultLabel = btnLabel ? btnLabel.textContent : '';
    var mailtoLink = form.querySelector('[data-mailto-link]');
    var TO = 'info@herointl.jp,hashimoto@andkids.jp';

    var TEXT = {
      ok: '<strong>送信が完了しました。</strong><br>お問い合わせありがとうございます。担当者より順次ご連絡いたします。<br>お急ぎの場合はお電話（<a href="tel:0428163228">042-816-3228</a>）でもお気軽にご連絡ください。',
      fail: '<strong>送信できませんでした。</strong><br>お手数ですが、下の<a data-mailto-inline href="#">メールアプリから送る</a>か、お電話（<a href="tel:0428163228">042-816-3228</a>）でご連絡ください。入力内容はそのまま残っています。',
      notReady: '<strong>フォームの自動送信は現在準備中です。</strong><br>下の<a data-mailto-inline href="#">メールアプリから送る</a>を押すと、入力内容が入ったメールが開きます。そのまま送信してください。'
    };

    var val = function (name) {
      var el = form.elements.namedItem(name);
      if (!el) { return ''; }
      if (el.length && el[0] && el[0].type === 'radio') {
        var checked = form.querySelector('input[name="' + name + '"]:checked');
        return checked ? checked.value.trim() : '';
      }
      return String(el.value || '').trim();
    };

    var payload = function () {
      return {
        name: val('name'),
        tel: val('tel'),
        user_email: val('user_email'),
        age: val('age'),
        purpose: val('purpose'),
        message: val('message'),
        website: val('website'),
        page: window.location.href.split('?')[0]
      };
    };

    var mailBody = function () {
      var d = payload();
      return [
        '【＆kids橋本 ホームページからのお問い合わせ】',
        '',
        'ご希望内容: ' + (d.purpose || '（未選択）'),
        'お名前: ' + (d.name || '（未入力）'),
        '電話番号: ' + (d.tel || '（未入力）'),
        'メールアドレス: ' + (d.user_email || '（未入力）'),
        'お子さまの年齢: ' + (d.age || '（未入力）'),
        '',
        '備考・ご質問:',
        d.message || '（なし）'
      ].join('\n');
    };

    var mailtoHref = function () {
      return 'mailto:' + TO
        + '?subject=' + encodeURIComponent('【＆kids橋本】お問い合わせ・見学予約')
        + '&body=' + encodeURIComponent(mailBody());
    };

    var syncMailto = function () {
      var href = mailtoHref();
      if (mailtoLink) { mailtoLink.setAttribute('href', href); }
      var inline = msg ? msg.querySelector('[data-mailto-inline]') : null;
      if (inline) { inline.setAttribute('href', href); }
    };

    var showMsg = function (type, html) {
      if (!msg) { return; }
      msg.className = 'note form-msg is-' + type;
      msg.innerHTML = html;
      msg.hidden = false;
      syncMailto();
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    var setSending = function (sending) {
      if (btn) { btn.disabled = sending; }
      if (btnLabel) { btnLabel.textContent = sending ? '送信中…' : defaultLabel; }
    };

    var digits = function (s) { return String(s || '').replace(/\D/g, ''); };

    // JS 無効ブラウザからの通常送信後に ?sent= で戻ってきた場合
    var sentParam = /[?&]sent=([^&]+)/.exec(window.location.search);
    if (sentParam) {
      showMsg(sentParam[1] === '1' ? 'ok' : 'error', sentParam[1] === '1' ? TEXT.ok : TEXT.fail);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
    }

    ['input', 'change'].forEach(function (ev) { form.addEventListener(ev, syncMailto); });
    syncMailto();

    // Apps Script は preflight（OPTIONS）に応答しないため、
    // Content-Type を text/plain にした「シンプルリクエスト」で JSON を送る
    var send = function (data) {
      var controller = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) { controller.abort(); } }, 20000);
      return fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        clearTimeout(timer);
        return res.json();
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
    };

    form.addEventListener('submit', function (e) {
      // 送信先が未設定なら、通常送信ではなくメールアプリ案内に切り替える
      if (!gasUrl) {
        e.preventDefault();
        showMsg('error', TEXT.notReady);
        return;
      }
      if (!window.fetch || !window.Promise) { return; } // 古いブラウザは通常送信（Apps Script 側で ?sent= に戻す）

      e.preventDefault();
      if (msg) { msg.hidden = true; }

      var data = payload();
      if (data.website) { form.reset(); showMsg('ok', TEXT.ok); return; }
      if (!data.name) { showMsg('error', 'お名前を入力してください。'); return; }
      if (digits(data.tel).length < 10) { showMsg('error', '電話番号を正しく入力してください。'); return; }
      if (data.user_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.user_email)) {
        showMsg('error', 'メールアドレスの形式が正しくありません。');
        return;
      }

      setSending(true);
      send(data)
        .then(function (res) {
          setSending(false);
          if (res && res.ok === true) {
            form.reset();
            showMsg('ok', TEXT.ok);
          } else {
            showMsg('error', TEXT.fail);
          }
        })
        .catch(function () {
          setSending(false);
          showMsg('error', TEXT.fail);
        });
    });
  }
})();
