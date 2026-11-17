<?php
// Request authenticity: signed form tokens (CSRF-style protection for a cross-origin static site) and
// Cloudflare Turnstile verification.
declare(strict_types=1);

const TOKEN_MAX_AGE = 7200;   // a form token is valid for two hours

function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/'), true); }

/**
 * A short-lived token the page fetches when the visitor starts filling a form. It is signed with form_secret and
 * bound to the calling origin, so a submission must come from a page that loaded it from this API first, and it
 * records when the form was started (submissions faster than limits.min_fill_seconds are refused).
 */
function issue_token(): string {
  $payload = time() . '.' . b64u(random_bytes(12));
  $sig = b64u(hash_hmac('sha256', $payload . '|' . ($_SERVER['HTTP_ORIGIN'] ?? ''), (string)cfg('form_secret'), true));
  return $payload . '.' . $sig;
}

/** '' if valid, else an error code: token / too_fast / expired. */
function check_token(string $token): string {
  $parts = explode('.', $token);
  if (count($parts) !== 3 || !ctype_digit($parts[0])) return 'token';
  [$ts, $nonce, $sig] = $parts;
  $expect = b64u(hash_hmac('sha256', "$ts.$nonce|" . ($_SERVER['HTTP_ORIGIN'] ?? ''), (string)cfg('form_secret'), true));
  if (!hash_equals($expect, $sig)) return 'token';
  $age = time() - (int)$ts;
  if ($age < limit_of('min_fill_seconds', 3)) return 'too_fast';
  if ($age > TOKEN_MAX_AGE) return 'expired';
  return '';
}

/**
 * Verify a Turnstile token with Cloudflare. Returns '' if valid (or if Turnstile is switched off), otherwise an
 * error code. Fails closed when Turnstile is required and Cloudflare can't be reached.
 */
function check_turnstile(string $token, string $idem): string {
  $secret = (string)cfg('turnstile_secret');
  if ($secret === '') return cfg('turnstile_required') ? 'turnstile_config' : '';
  if ($token === '' || strlen($token) > 2048) return 'turnstile';
  $ch = curl_init(cfg('turnstile_verify_url') ?: 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_POSTFIELDS => http_build_query(['secret' => $secret, 'response' => $token, 'remoteip' => client_ip(), 'idempotency_key' => $idem]),
  ]);
  $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  if (!$res || $code !== 200) { log_event('warn', 'turnstile_unreachable', ['http' => $code]); return 'turnstile_unavailable'; }
  $d = json_decode((string)$res, true) ?: [];
  if (empty($d['success'])) { log_event('info', 'turnstile_rejected', ['codes' => implode(',', (array)($d['error-codes'] ?? []))]); return 'turnstile'; }
  // the token must have been issued on one of our own sites
  $hosts = array_map(fn($o) => (string)parse_url($o, PHP_URL_HOST), cfg('allowed_origins') ?: []);
  $dummy = (bool)preg_match('/^[123]x0{31}AA$/', $secret);   // Cloudflare's test keys always report "localhost"
  if (!$dummy && !empty($d['hostname']) && !in_array($d['hostname'], $hosts, true)) { log_event('warn', 'turnstile_hostname', ['host' => (string)$d['hostname']]); return 'turnstile'; }
  return '';
}
