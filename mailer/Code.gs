/**
 * こども発達らぼ ＆kids橋本 ─ お問い合わせメーラー（Google Apps Script）
 *
 * ホームページ（hashimoto.andkids.jp/contact.html）から送られた内容を
 * info@herointl.jp と hashimoto@andkids.jp の両方へメールします。
 *
 * ── デプロイ手順（初回のみ・約5分） ─────────────────────────────
 * 1. https://script.google.com/home を開き「新しいプロジェクト」
 * 2. 左の「コード.gs」の中身をすべて消し、このファイルの内容を貼り付けて保存（Ctrl+S）
 *    プロジェクト名は「andkids-hashimoto-contact」など分かる名前に
 * 3. 右上「デプロイ」→「新しいデプロイ」
 *    - 歯車 →「ウェブアプリ」を選ぶ
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員   ← 重要（「全員」でないとフォームから送れません）
 *    - 「デプロイ」→ 初回はアクセス許可の確認が出るので「許可」
 * 4. 表示される「ウェブアプリの URL」（https://script.google.com/macros/s/……/exec）をコピー
 * 5. contact.html の <form … data-gas-url="ここ"> と action="ここ" に貼る
 *
 * ── 確認 ─────────────────────────────────────────────────────────
 * ブラウザでウェブアプリの URL を開くと {"ok":true,"service":"andkids-hashimoto-contact"} と出れば稼働中です。
 *
 * ── 変更したいとき ────────────────────────────────────────────────
 * 宛先を変える: 下の TO を編集 → 保存 →「デプロイ」→「デプロイを管理」→ 鉛筆 →
 * バージョン「新バージョン」→「デプロイ」。URL は変わりません。
 */

var CONFIG = {
  TO: ['info@herointl.jp', 'hashimoto@andkids.jp'],
  SENDER_NAME: '＆kids橋本 ホームページ',
  DEFAULT_REPLY_TO: 'hashimoto@andkids.jp',
  SITE_URL: 'https://hashimoto.andkids.jp/contact.html',
  // 回答をスプレッドシートにも残したい場合は、シートの ID（URL の /d/ と /edit の間）を入れる
  SHEET_ID: ''
};

function doGet() {
  return json_({ ok: true, service: 'andkids-hashimoto-contact' });
}

function doPost(e) {
  try {
    var data = parseBody_(e);
    var isBrowserForm = !!(e && e.postData && /x-www-form-urlencoded|multipart/.test(e.postData.type || ''));

    if (data.website || data._honey) {
      return isBrowserForm ? redirect_('sent=1') : json_({ ok: true });
    }

    var name = clean_(data.name);
    var tel = clean_(data.tel);
    var userEmail = clean_(data.user_email || data.email);
    var purpose = clean_(data.purpose);
    var age = clean_(data.age);
    var message = clean_(data.message);

    if (!name || tel.replace(/\D/g, '').length < 10) {
      return isBrowserForm ? redirect_('sent=0') : json_({ ok: false, error: 'validation' });
    }
    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return isBrowserForm ? redirect_('sent=0') : json_({ ok: false, error: 'email' });
    }

    var body = [
      '【＆kids橋本 ホームページからのお問い合わせ】',
      '',
      'ご希望内容　　: ' + (purpose || '（未選択）'),
      'お名前　　　　: ' + name,
      '電話番号　　　: ' + tel,
      'メールアドレス: ' + (userEmail || '（未入力・お電話でご連絡ください）'),
      'お子さまの年齢: ' + (age || '（未入力）'),
      '',
      '備考・ご質問:',
      message || '（なし）',
      '',
      '---',
      '受信日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
      '送信元　: ' + CONFIG.SITE_URL,
      'このメールは ' + CONFIG.TO.join(' と ') + ' の両方に送っています。'
    ].join('\n');

    MailApp.sendEmail({
      to: CONFIG.TO.join(','),
      replyTo: userEmail || CONFIG.DEFAULT_REPLY_TO,
      name: CONFIG.SENDER_NAME,
      subject: '【＆kids橋本】' + (purpose || 'お問い合わせ') + '：' + name + ' 様',
      body: body
    });

    appendToSheet_([new Date(), purpose, name, tel, userEmail, age, message]);

    return isBrowserForm ? redirect_('sent=1') : json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function parseBody_(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      if (parsed && typeof parsed === 'object') { data = parsed; }
    } catch (ignore) { /* URLエンコード送信のときは e.parameter を使う */ }
  }
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) {
      if (!(k in data)) { data[k] = e.parameter[k]; }
    });
  }
  return data;
}

function clean_(v) {
  return String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, 2000);
}

function appendToSheet_(row) {
  if (!CONFIG.SHEET_ID) { return; }
  try {
    var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['受信日時', 'ご希望内容', 'お名前', '電話番号', 'メールアドレス', 'お子さまの年齢', '備考・ご質問']);
    }
    sheet.appendRow(row);
  } catch (ignore) { /* シート保存に失敗してもメール送信は成功扱いにする */ }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// JavaScript が無効なブラウザから通常送信されたときは、橋本のページへ戻す
function redirect_(query) {
  var url = CONFIG.SITE_URL + '?' + query;
  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>送信完了</title></head>'
    + '<body style="font-family:sans-serif;padding:24px;line-height:1.8">'
    + '<p>送信を受け付けました。ページに戻ります…</p>'
    + '<p><a href="' + url + '">自動で戻らない場合はこちら</a></p>'
    + '<script>window.top.location.href=' + JSON.stringify(url) + ';</script>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// エディタ上で「実行」して権限を許可するためのテスト（メールが2通届きます）
function sendTestMail() {
  var res = doPost({
    postData: {
      type: 'application/json',
      contents: JSON.stringify({
        name: 'テスト送信',
        tel: '042-816-3228',
        user_email: '',
        purpose: '見学',
        age: '3歳',
        message: 'Google Apps Script のデプロイ確認です。ご対応不要です。'
      })
    }
  });
  Logger.log(res.getContent());
}
