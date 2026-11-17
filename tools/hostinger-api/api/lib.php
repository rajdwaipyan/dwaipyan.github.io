<?php
// Shared helpers: config, database, rate limits, JSON responses, AI calls. PHP 8.0+ with PDO and cURL
// (both available on Hostinger shared hosting).
declare(strict_types=1);

const CONFIG_PATH = __DIR__ . '/config.php';

function cfg(?string $key = null) {
  static $c = null;
  if ($c === null) {
    if (!is_file(CONFIG_PATH)) { http_response_code(503); header('Content-Type: application/json'); echo '{"error":"not configured"}'; exit; }
    $c = require CONFIG_PATH;
  }
  return $key === null ? $c : ($c[$key] ?? null);
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $pdo = new PDO(cfg('db_dsn'), cfg('db_user') ?: null, cfg('db_pass') ?: null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
  $id = $mysql ? 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  $text = $mysql ? 'MEDIUMTEXT' : 'TEXT';
  $pdo->exec("CREATE TABLE IF NOT EXISTS inquiries (
    id $id, ref VARCHAR(16) NOT NULL, created_at VARCHAR(25) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'new',
    name VARCHAR(120), email VARCHAR(160), company VARCHAR(160), country VARCHAR(80), industry VARCHAR(80), size VARCHAR(80),
    services TEXT, budget VARCHAR(60), timeline VARCHAR(60), engagement VARCHAR(60),
    about TEXT, challenge TEXT, have TEXT, brief $text, blueprint $text, proposal $text, notes TEXT, ip_hash VARCHAR(64))");
  $pdo->exec("CREATE TABLE IF NOT EXISTS hits (ip_hash VARCHAR(64) NOT NULL, bucket VARCHAR(20) NOT NULL, day VARCHAR(10) NOT NULL, n INT NOT NULL DEFAULT 0, PRIMARY KEY (ip_hash, bucket, day))");
  return $pdo;
}

function json_out(array $body, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function cors(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $ok = in_array($origin, cfg('allowed_origins') ?: [], true);
  header('Vary: Origin');
  header('X-Content-Type-Options: nosniff');
  if ($ok) { header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Methods: POST, GET, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type'); header('Access-Control-Max-Age: 86400'); }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code($ok ? 204 : 403); exit; }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && !$ok) json_out(['error' => 'origin not allowed'], 403);
}

function body(): array {
  $raw = file_get_contents('php://input', false, null, 0, 65536) ?: '';
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function s($v, int $max): string {   // a clean single string, length-limited
  $v = is_scalar($v) ? (string)$v : '';
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
  return mb_substr(trim($v), 0, $max);
}

function ip_hash(): string { return hash('sha256', (cfg('ip_salt') ?: '') . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')); }

/** true if this visitor is over today's limit for $bucket (and counts this call) */
function limited(string $bucket): bool {
  $max = (int)((cfg('limits') ?: [])[$bucket] ?? 20);
  $pdo = db(); $h = ip_hash(); $day = gmdate('Y-m-d');
  $st = $pdo->prepare('SELECT n FROM hits WHERE ip_hash=? AND bucket=? AND day=?'); $st->execute([$h, $bucket, $day]);
  $n = (int)($st->fetchColumn() ?: 0);
  if ($n >= $max) return true;
  if ($n === 0) $pdo->prepare('INSERT INTO hits (ip_hash, bucket, day, n) VALUES (?,?,?,1)')->execute([$h, $bucket, $day]);
  else $pdo->prepare('UPDATE hits SET n=n+1 WHERE ip_hash=? AND bucket=? AND day=?')->execute([$h, $bucket, $day]);
  if (random_int(1, 50) === 1) $pdo->prepare('DELETE FROM hits WHERE day < ?')->execute([gmdate('Y-m-d', time() - 3 * 86400)]);
  return false;
}

/** one call to the AI model; returns text or null (never throws) */
function ai(string $system, array $messages, int $maxTokens = 600): ?string {
  $key = cfg('ai_key'); $model = cfg('ai_model');
  if (!$key || !$model || !function_exists('curl_init')) return null;
  $ch = curl_init(cfg('ai_url') ?: 'https://api.anthropic.com/v1/messages');
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_HTTPHEADER => ['content-type: application/json', 'x-api-key: ' . $key, 'anthropic-version: 2023-06-01'],
    CURLOPT_POSTFIELDS => json_encode(['model' => $model, 'max_tokens' => $maxTokens, 'system' => $system, 'messages' => $messages]),
  ]);
  $res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  if (!$res || $code !== 200) return null;
  $d = json_decode($res, true);
  $text = '';
  foreach (($d['content'] ?? []) as $b) if (($b['type'] ?? '') === 'text') $text .= $b['text'];
  $text = trim($text);
  return $text !== '' ? $text : null;
}

function mail_owner(string $subject, string $body, string $replyTo = ''): bool {
  $to = cfg('owner_email'); $from = cfg('from_email');
  if (!$to || !$from || !function_exists('mail')) return false;
  $clean = fn($v) => str_replace(["\r", "\n"], '', $v);
  $headers = ['From: ' . $clean($from), 'Content-Type: text/plain; charset=UTF-8', 'X-Mailer: solutions-api'];
  if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $headers[] = 'Reply-To: ' . $clean($replyTo);
  return @mail($to, '=?UTF-8?B?' . base64_encode($clean($subject)) . '?=', $body, implode("\r\n", $headers));
}
