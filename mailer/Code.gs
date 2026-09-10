/**
 * ＆kids橋本 お問い合わせメーラー（Google アプリスクリプト）
 *
 * 使い方:
 * 1. https://script.google.com で新しいプロジェクトを作る
 * 2. このファイルの内容を貼り付ける
 * 3. デプロイ → 新しいデプロイ → 種類: ウェブアプリ
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 4. 発行された URL を contact.html の data-gas-url に貼る
 */
function doPost(e) {
  var TO = ['info@herointl.jp', 'hashimoto@andkids.jp'];
  var data = {};
  try {
    data = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : (e.parameter || {});
  } catch (err) {
    data = e.parameter || {};
  }

  if (data.website || data._honey) {
    return json_({ ok: true });
  }

  var name = String(data.name || '').trim();
  var tel = String(data.tel || '').trim();
  var userEmail = String(data.user_email || data.email || '').trim();
  if (!name || String(tel).replace(/\D/g, '').length < 10) {
    return json_({ ok: false, error: 'validation' }, 400);
  }

  var purpose = String(data.purpose || '').trim();
  var age = String(data.age || '').trim();
  var message = String(data.message || data.body || '').trim();
  var replyTo = userEmail || 'hashimoto@andkids.jp';
  var body = [
    '【＆kids橋本 ホームページからのお問い合わせ】',
    '',
    'ご希望内容: ' + (purpose || '（未選択）'),
    'お名前: ' + name,
    '電話番号: ' + tel,
    'メールアドレス: ' + (userEmail || '（未入力・お電話でご連絡ください）'),
    'お子さまの年齢: ' + (age || '（未入力）'),
    '',
    '備考・ご質問:',
    message || '（なし）',
    '',
    '---',
    'このメールは info@herointl.jp と hashimoto@andkids.jp の両方に送っています。'
  ].join('\n');

  MailApp.sendEmail({
    to: TO.join(','),
    replyTo: replyTo,
    subject: '【＆kids橋本】お問い合わせ・見学予約（' + purpose + name + '）',
    body: body
  });

  return json_({ ok: true });
}

function doOptions() {
  return json_({ ok: true });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
