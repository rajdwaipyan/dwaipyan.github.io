<?php
// Portfolio API — public entry point (upload to public_html/api/). All code and secrets live in ~/portfolio-api/.
//   GET  /health     is the API installed and configured? (no secrets)
//   GET  /token      a short-lived signed form token
//   POST /submit     every form on the site: store, email the owner, confirm to the visitor
//   POST /blueprint  optional AI notes on a Business Builder blueprint
//   POST /twin       optional AI answers for the digital twin
declare(strict_types=1);
require (require __DIR__ . '/locate.php');

cors();
$route = trim((string)($_GET['r'] ?? ($_SERVER['PATH_INFO'] ?? '')), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
  if ($route === 'health' || $route === '') {
    $db = false;
    try { db(); $db = true; } catch (\Throwable $e) { log_event('error', 'db_unavailable', ['detail' => $e->getMessage()]); }
    $problems = config_problems();
    json_out([
      'ok' => $db && !$problems && !home_is_public(),
      'database' => $db,
      'configured' => !$problems,
      'turnstile' => (bool)cfg('turnstile_secret'),
      'private_folder_outside_web_root' => !home_is_public(),
      'ai' => (bool)(cfg('ai_key') && cfg('ai_model')),
    ]);
  }
  if ($route === 'token') {
    if ($method !== 'GET') json_out(['ok' => false, 'error' => 'method'], 405);
    json_out(['ok' => true, 'token' => issue_token()]);
  }
  if ($method !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
  $in = body();
  if ($route === 'submit') handle_submit($in);
  if ($route === 'blueprint') blueprint_notes($in);
  if ($route === 'twin') twin($in);
  json_out(['ok' => false, 'error' => 'not_found'], 404);
} catch (\Throwable $e) {
  log_event('error', 'exception', ['detail' => get_class($e) . ': ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine()]);
  json_out(['ok' => false, 'error' => 'server'], 500);
}
