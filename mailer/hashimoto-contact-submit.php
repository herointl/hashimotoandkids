<?php
/**
 * ＆kids橋本 お問い合わせメーラー
 *
 * このファイルを運営会社サイト（herointl.jp）のドキュメントルートへ
 * そのままアップロードすると、次の URL で受け付けます。
 *   https://herointl.jp/hashimoto-contact-submit.php
 *
 * 送信先: info@herointl.jp / hashimoto@andkids.jp
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Location: https://hashimoto.andkids.jp/contact.html');
  exit;
}

$TO = ['info@herointl.jp', 'hashimoto@andkids.jp'];
$FROM = 'info@herointl.jp';
$ALLOWED_REDIRECT = 'https://hashimoto.andkids.jp/contact.html?sent=1';

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

$input = $_POST;
if (empty($input)) {
  $raw = file_get_contents('php://input') ?: '';
  $json = json_decode($raw, true);
  if (is_array($json)) {
    $input = $json;
    $wantsJson = true;
  }
}

$pick = static function (array $src, array $keys): string {
  foreach ($keys as $key) {
    if (isset($src[$key]) && is_scalar($src[$key])) {
      return trim((string) $src[$key]);
    }
  }
  return '';
};

// ハニーポット。入力されていたら成功扱いで捨てる
if ($pick($input, ['website', '_honey']) !== '') {
  if ($wantsJson) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Location: ' . $ALLOWED_REDIRECT);
  exit;
}

$name = $pick($input, ['name', 'お名前']);
$tel = $pick($input, ['tel', '電話番号']);
$userEmail = $pick($input, ['user_email', 'email', 'メールアドレス']);
$age = $pick($input, ['age', 'お子さまの年齢']);
$purpose = $pick($input, ['purpose', 'ご希望内容']);
$message = $pick($input, ['message', 'body', '備考・ご質問']);

if ($name === '' || !preg_match('/\d{10,}/', preg_replace('/\D+/', '', $tel) ?? '')) {
  if ($wantsJson) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'validation'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Location: https://hashimoto.andkids.jp/contact.html?sent=0');
  exit;
}

if ($userEmail !== '' && !filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
  if ($wantsJson) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'email'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Location: https://hashimoto.andkids.jp/contact.html?sent=0');
  exit;
}

$replyTo = $userEmail !== '' ? $userEmail : 'hashimoto@andkids.jp';
$lines = [
  '【＆kids橋本 ホームページからのお問い合わせ】',
  '',
  'ご希望内容: ' . ($purpose !== '' ? $purpose : '（未選択）'),
  'お名前: ' . $name,
  '電話番号: ' . $tel,
  'メールアドレス: ' . ($userEmail !== '' ? $userEmail : '（未入力・お電話でご連絡ください）'),
  'お子さまの年齢: ' . ($age !== '' ? $age : '（未入力）'),
  '',
  '備考・ご質問:',
  $message !== '' ? $message : '（なし）',
  '',
  '---',
  'このメールは info@herointl.jp と hashimoto@andkids.jp の両方に送っています。',
];
$body = implode("\n", $lines);
$subject = '【＆kids橋本】お問い合わせ・見学予約（' . $purpose . $name . '）';

if (!function_exists('mb_language')) {
  if ($wantsJson) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Location: https://hashimoto.andkids.jp/contact.html?sent=error');
  exit;
}

mb_language('Japanese');
mb_internal_encoding('UTF-8');

$headers = [
  'From: ＆kids橋本 <' . $FROM . '>',
  'Reply-To: ' . $replyTo,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
];

$sent = 0;
foreach ($TO as $addr) {
  if (mb_send_mail($addr, $subject, $body, implode("\r\n", $headers), '-f' . $FROM)) {
    $sent++;
  }
}

if ($sent < 1) {
  if ($wantsJson) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'send'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Location: https://hashimoto.andkids.jp/contact.html?sent=error');
  exit;
}

if ($wantsJson) {
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => true, 'sent' => $sent], JSON_UNESCAPED_UNICODE);
  exit;
}

header('Location: ' . $ALLOWED_REDIRECT);
exit;
