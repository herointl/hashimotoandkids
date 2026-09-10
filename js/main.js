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

  /* --- お問い合わせフォーム --- */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var msg = form.querySelector('[data-form-msg]');
    var btn = form.querySelector('[data-submit-btn]');
    var btnLabel = form.querySelector('[data-submit-label]');
    var defaultLabel = btnLabel ? btnLabel.textContent : '';
    var bodyInput = form.querySelector('[data-mail-body]');
    var emailInput = form.querySelector('[data-mail-fallback]');
    var mailtoLink = document.querySelector('[data-mailto-link]');
    var defaultBody = bodyInput ? bodyInput.value : '';
    var fallbackEmail = emailInput ? emailInput.value : 'hashimoto@andkids.jp';
    var dedicatedUrl = form.getAttribute('data-dedicated-url') || '';
    var gasUrl = form.getAttribute('data-gas-url') || '';

    var TEXT = {
      ok: '<strong>送信が完了しました。</strong><br>お問い合わせありがとうございます。担当者より順次ご連絡いたします。<br>お急ぎの場合はお電話（<a href="tel:0428163228">042-816-3228</a>）でもお気軽にご連絡ください。',
      error: '<strong>自動送信を確認できませんでした。</strong><br>下の「メールアプリから送る」を押すと、<a href="mailto:info@herointl.jp,hashimoto@andkids.jp">info@herointl.jp</a> と <a href="mailto:hashimoto@andkids.jp">hashimoto@andkids.jp</a> の両方に送れます。',
      mailto: '<strong>メールアプリを開きました。</strong><br>送信を押すと <strong>info@herointl.jp</strong> と <strong>hashimoto@andkids.jp</strong> の両方に届きます。アプリが開かない場合は、下のリンクから開いてください。'
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

    var val = function (name) {
      var el = form.elements.namedItem(name);
      if (!el) { return ''; }
      if (el.length && el[0] && el[0].type === 'radio') {
        var checked = form.querySelector('input[name="' + name + '"]:checked');
        return checked ? checked.value.trim() : '';
      }
      return String(el.value || '').trim();
    };

    var digits = function (s) { return String(s || '').replace(/\D/g, ''); };

    var buildBody = function () {
      var userEmail = val('user_email');
      return [
        '【＆kids橋本 ホームページからのお問い合わせ】',
        '',
        'ご希望内容: ' + (val('purpose') || '（未選択）'),
        'お名前: ' + (val('name') || '（未入力）'),
        '電話番号: ' + (val('tel') || '（未入力）'),
        'メールアドレス: ' + (userEmail || '（未入力・お電話でご連絡ください）'),
        'お子さまの年齢: ' + (val('age') || '（未入力）'),
        '',
        '備考・ご質問:',
        val('message') || '（なし）',
        '',
        '---',
        '送信元: ' + window.location.href.split('?')[0],
        'この内容は info@herointl.jp と hashimoto@andkids.jp の両方へお送りください。'
      ].join('\n');
    };

    var prepareFields = function () {
      var userEmail = val('user_email');
      if (emailInput) { emailInput.value = userEmail || fallbackEmail; }
      if (bodyInput) { bodyInput.value = buildBody(); }
    };

    var mailtoHref = function () {
      return 'mailto:info@herointl.jp,hashimoto@andkids.jp'
        + '?subject=' + encodeURIComponent('【＆kids橋本】お問い合わせ・見学予約')
        + '&body=' + encodeURIComponent(buildBody());
    };

    var syncMailto = function () {
      if (mailtoLink) { mailtoLink.setAttribute('href', mailtoHref()); }
    };

    var resetHidden = function () {
      if (bodyInput) { bodyInput.value = defaultBody; }
      if (emailInput) { emailInput.value = fallbackEmail; }
    };

    var payload = function () {
      return {
        name: val('name'),
        tel: val('tel'),
        user_email: val('user_email'),
        email: val('user_email') || fallbackEmail,
        age: val('age'),
        purpose: val('purpose'),
        message: val('message'),
        body: buildBody(),
        type: 'こども発達らぼ＆kids について',
        company: '＆kids橋本ホームページ',
        website: val('website')
      };
    };

    var postJson = function (url) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload())
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || data.ok !== true) { throw new Error('rejected'); }
          return data;
        }, function () { throw new Error('non-json'); });
      });
    };

    var finished = false;
    var timer = null;

    var succeed = function () {
      if (finished) { return; }
      finished = true;
      if (timer) { clearTimeout(timer); }
      form.reset();
      resetHidden();
      setSending(false);
      showMsg('ok', TEXT.ok);
    };

    var openMailto = function () {
      if (finished) { return; }
      finished = true;
      if (timer) { clearTimeout(timer); }
      setSending(false);
      syncMailto();
      showMsg('ok', TEXT.mailto);
      window.location.href = mailtoHref();
    };

    if (/[?&]sent=1(&|$)/.test(window.location.search)) {
      showMsg('ok', TEXT.ok);
    }

    ['input', 'change'].forEach(function (ev) {
      form.addEventListener(ev, syncMailto);
    });
    syncMailto();

    form.addEventListener('submit', function (e) {
      if (!window.fetch) { prepareFields(); return; }
      e.preventDefault();
      if (msg) { msg.hidden = true; }

      if (val('website')) { showMsg('ok', TEXT.ok); form.reset(); return; }
      if (!val('name')) { showMsg('error', 'お名前を入力してください。'); return; }
      if (digits(val('tel')).length < 10) { showMsg('error', '電話番号を正しく入力してください。'); return; }
      if (val('user_email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('user_email'))) {
        showMsg('error', 'メールアドレスの形式が正しくありません。');
        return;
      }

      prepareFields();
      syncMailto();
      setSending(true);
      finished = false;
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(openMailto, 8000);

      var endpoints = [];
      if (gasUrl) { endpoints.push(gasUrl); }
      if (dedicatedUrl) { endpoints.push(dedicatedUrl); }

      var tryNext = function (i) {
        if (i < endpoints.length) {
          postJson(endpoints[i]).then(succeed).catch(function () { tryNext(i + 1); });
          return;
        }
        // サーバー側メーラーが未設置／失敗したときは、両方の宛先へメールアプリで送る
        openMailto();
      };

      tryNext(0);
    });
  }
})();
