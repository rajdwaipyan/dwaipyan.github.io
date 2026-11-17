<?php
// Core helpers: configuration, database, JSON responses, CORS, input cleaning, rate limits and logging.
// PHP 8.0+ with PDO, OpenSSL and cURL — all standard on Hostinger shared hosting.
declare(strict_types=1);

/** The configuration array (or one key of it). Loaded once from outside the web root. */
function cfg(?string $key = null) {
  static $c = null;
  if ($c === null) {
    $path = getenv('PORTFOLIO_API_CONFIG') ?: API_HOME . '/config.php';
    if (!is_file($path)) {
      log_event('error', 'config_missing');
      if (PHP_SAPI === 'cli') { fwrite(STDERR, "Missing config: $path\n"); exit(1); }
      json_out(['ok' => false, 'error' => 'not_configured'], 503);
    }
    $c = require $path;
  }
  return $key === null ? $c : ($c[$key] ?? null);
}

/** Nested config value, e.g. cfgv('smtp.host'). */
function cfgv(string $path, $default = null) {
  $v = cfg();
  foreach (explode('.', $path) as $k) { if (!is_array($v) || !array_key_exists($k, $v)) return $default; $v = $v[$k]; }
  return $v;
}

function limit_of(string $k, int $default): int { return (int)(cfgv("limits.$k") ?? $default); }

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $pdo = new PDO((string)cfg('db_dsn'), cfg('db_user') ?: null, cfg('db_pass') ?: null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 5,
  ]);
  migrate($pdo);
  return $pdo;
}

function is_mysql(PDO $pdo): bool { return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }

function migrate(PDO $pdo): void {
  $my = is_mysql($pdo);
  $id = $my ? 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  $big = $my ? 'MEDIUMTEXT' : 'TEXT';
  $tail = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
  $pdo->exec("CREATE TABLE IF NOT EXISTS submissions (
    id $id,
    ref VARCHAR(20) NOT NULL,
    source VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at VARCHAR(25) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(40) NULL,
    company VARCHAR(160) NULL,
    services TEXT NULL,
    budget VARCHAR(80) NULL,
    timeline VARCHAR(80) NULL,
    message TEXT NOT NULL,
    details TEXT NULL,
    blueprint $big NULL,
    page VARCHAR(200) NULL,
    consent TINYINT NOT NULL DEFAULT 0,
    ip_hash VARCHAR(64) NULL,
    idem_key VARCHAR(64) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    admin_mail VARCHAR(12) NOT NULL DEFAULT 'pending',
    client_mail VARCHAR(12) NOT NULL DEFAULT 'pending',
    mail_attempts INT NOT NULL DEFAULT 0,
    mail_error VARCHAR(255) NULL,
    proposal TEXT NULL,
    notes TEXT NULL
  )$tail");
  // indexes (ignore 'already exists')
  foreach ([
    'CREATE UNIQUE INDEX ux_sub_ref ON submissions (ref)',
    'CREATE UNIQUE INDEX ux_sub_idem ON submissions (idem_key)',
    'CREATE INDEX ix_sub_hash ON submissions (content_hash)',
    'CREATE INDEX ix_sub_mail ON submissions (admin_mail, client_mail)',
  ] as $sql) { try { $pdo->exec($sql); } catch (PDOException $e) { /* exists */ } }
  $pdo->exec("CREATE TABLE IF NOT EXISTS rate_hits (k VARCHAR(100) NOT NULL PRIMARY KEY, n INT NOT NULL, exp INT NOT NULL)$tail");
}

function json_out(array $body, int $status = 200): void {
  if (!headers_sent()) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
  }
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** Only the configured site may call the API. JSON bodies force a CORS preflight, so other sites can't post. */
function cors(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $ok = $origin !== '' && in_array($origin, cfg('allowed_origins') ?: [], true);
  header('Vary: Origin');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: no-referrer');
  header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
  if ($ok) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
  }
  $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if ($m === 'OPTIONS') { http_response_code($ok ? 204 : 403); exit; }
  if ($m === 'POST') {
    if (!$ok) json_out(['ok' => false, 'error' => 'origin'], 403);
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) json_out(['ok' => false, 'error' => 'content_type'], 415);
  }
}

function body(): array {
  $raw = file_get_contents('php://input', false, null, 0, 65536) ?: '';
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

/** A clean single-line string: control characters and line breaks removed, trimmed, length-limited. */
function line($v, int $max): string {
  $v = is_scalar($v) ? (string)$v : '';
  if (!mb_check_encoding($v, 'UTF-8')) $v = mb_convert_encoding($v, 'UTF-8', 'UTF-8');
  $v = preg_replace('/[\x00-\x1F\x7F\x{2028}\x{2029}]+/u', ' ', $v) ?? '';
  return mb_substr(trim(preg_replace('/\s{2,}/u', ' ', $v) ?? ''), 0, $max);
}

/** A clean multi-line text: control characters removed except line breaks, length-limited. */
function text($v, int $max): string {
  $v = is_scalar($v) ? (string)$v : '';
  if (!mb_check_encoding($v, 'UTF-8')) $v = mb_convert_encoding($v, 'UTF-8', 'UTF-8');
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
  $v = preg_replace("/\n{4,}/", "\n\n\n", $v) ?? '';
  return mb_substr(trim($v), 0, $max);
}

function client_ip(): string { return (string)($_SERVER['REMOTE_ADDR'] ?? ''); }
function ip_hash(): string { return hash_hmac('sha256', client_ip(), (string)cfg('ip_salt')); }

/** Count one hit for $key in a window of $seconds; true if the count is now over $max. */
function over_limit(string $key, int $max, int $seconds): bool {
  $pdo = db();
  $now = time();
  $k = substr($key . ':' . intdiv($now, $seconds), 0, 100);
  $exp = (intdiv($now, $seconds) + 1) * $seconds;
  if (is_mysql($pdo)) $pdo->prepare('INSERT INTO rate_hits (k, n, exp) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE n = n + 1')->execute([$k, $exp]);
  else $pdo->prepare('INSERT INTO rate_hits (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1')->execute([$k, $exp]);
  $st = $pdo->prepare('SELECT n FROM rate_hits WHERE k = ?'); $st->execute([$k]);
  if (random_int(1, 40) === 1) $pdo->prepare('DELETE FROM rate_hits WHERE exp < ?')->execute([$now]);
  return (int)$st->fetchColumn() > $max;
}

/** Daily per-visitor limit used by the AI endpoints. */
function limited(string $bucket, int $default = 20): bool {
  return over_limit('ai:' . $bucket . ':' . ip_hash(), limit_of($bucket, $default), 86400);
}

/** j***@example.com — for logs. */
function mask_email(string $e): string {
  $at = strrpos($e, '@');
  return $at === false ? '***' : mb_substr($e, 0, 1) . '***' . substr($e, $at);
}

/**
 * Append one JSON line to logs/app.log (outside the web root). Never pass message bodies, passwords or tokens:
 * events carry a reference, a source, statuses and short error categories only.
 */
function log_event(string $level, string $event, array $ctx = []): void {
  $dir = API_HOME . '/logs';
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  $file = $dir . '/app.log';
  if (is_file($file) && filesize($file) > 1_000_000) @rename($file, $file . '.1');
  foreach ($ctx as $k => $v) if (is_string($v)) $ctx[$k] = mb_substr(preg_replace('/[\r\n]+/', ' ', $v) ?? '', 0, 240);
  @file_put_contents($file, json_encode(['t' => gmdate('c'), 'level' => $level, 'event' => $event] + $ctx, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

/** True if the configuration still has template values. Lists keys only — never values. */
function config_problems(): array {
  $p = [];
  $check = [
    'smtp.password' => cfgv('smtp.password'), 'smtp.username' => cfgv('smtp.username'), 'from_email' => cfg('from_email'),
    'owner_email' => cfg('owner_email'), 'ip_salt' => cfg('ip_salt'), 'form_secret' => cfg('form_secret'), 'db_pass' => cfg('db_pass'),
  ];
  foreach ($check as $k => $v) if (!is_string($v) || $v === '' || str_contains($v, 'CHANGE-ME') || str_contains($v, 'your-domain')) $p[] = $k;
  foreach (['ip_salt', 'form_secret'] as $k) if (is_string(cfg($k)) && strlen((string)cfg($k)) < 32 && !in_array($k, $p, true)) $p[] = "$k (too short)";
  if (cfg('turnstile_required') && !cfg('turnstile_secret')) $p[] = 'turnstile_secret';
  if (preg_match('/^[123]x0{31}AA$/', (string)cfg('turnstile_secret'))) $p[] = 'turnstile_secret (Cloudflare TEST key — replace before going live)';
  return $p;
}

/** True if API_HOME is inside the public web root (it must not be). */
function home_is_public(): bool {
  $root = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
  $home = realpath(API_HOME);
  return $root && $home && str_starts_with($home . '/', rtrim($root, '/') . '/');
}
