<?php
// Enquiry inbox for the owner: list, read, set status, add notes, export CSV. Password from config.php.
declare(strict_types=1);
require __DIR__ . '/lib.php';
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']), 'samesite' => 'Strict']);
session_start();
header('X-Frame-Options: DENY'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
$e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($post && !hash_equals($csrf, (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Bad request'); }

// login (with a small delay against guessing)
if (empty($_SESSION['admin'])) {
  $err = '';
  if ($post && isset($_POST['password'])) {
    usleep(400000);
    $hash = (string)cfg('admin_password_hash');
    if ($hash !== '' && password_verify((string)$_POST['password'], $hash)) { session_regenerate_id(true); $_SESSION['admin'] = 1; header('Location: admin.php'); exit; }
    $err = $hash === '' ? 'Set admin_password_hash in config.php first.' : 'Wrong password.';
  }
  page('Sign in', '<form method="post" class="login"><h1>Enquiries</h1><label>Password <input type="password" name="password" autofocus required></label><input type="hidden" name="csrf" value="' . $csrf . '"><button>Sign in</button>' . ($err ? '<p class="err">' . $e($err) . '</p>' : '') . '</form>');
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: admin.php'); exit; }

$pdo = db();
$statuses = ['new', 'contacted', 'proposal sent', 'won', 'closed'];
if ($post && isset($_POST['id'])) {
  $status = in_array($_POST['status'] ?? '', $statuses, true) ? $_POST['status'] : 'new';
  $pdo->prepare('UPDATE inquiries SET status=?, notes=? WHERE id=?')->execute([$status, s($_POST['notes'] ?? '', 5000), (int)$_POST['id']]);
  header('Location: admin.php?id=' . (int)$_POST['id']); exit;
}
if (isset($_GET['csv'])) {
  header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="enquiries.csv"');
  $out = fopen('php://output', 'w');
  $cols = ['ref', 'created_at', 'status', 'name', 'email', 'company', 'country', 'industry', 'size', 'services', 'budget', 'timeline', 'engagement', 'about', 'challenge'];
  fputcsv($out, $cols);
  foreach ($pdo->query('SELECT ' . implode(',', $cols) . ' FROM inquiries ORDER BY id DESC') as $r) fputcsv($out, array_map(fn($v) => preg_match('/^[=+\-@]/', (string)$v) ? "'" . $v : $v, $r));
  exit;
}
if (isset($_GET['id'])) {
  $st = $pdo->prepare('SELECT * FROM inquiries WHERE id=?'); $st->execute([(int)$_GET['id']]); $r = $st->fetch();
  if (!$r) { header('Location: admin.php'); exit; }
  $opts = implode('', array_map(fn($s) => '<option' . ($s === $r['status'] ? ' selected' : '') . '>' . $s . '</option>', $statuses));
  page($r['ref'], '<p><a href="admin.php">← All enquiries</a></p><h1>' . $e($r['ref']) . ' · ' . $e($r['company'] ?: $r['name']) . '</h1>'
    . '<p class="meta">' . $e($r['created_at']) . ' · <a href="mailto:' . $e($r['email']) . '?subject=' . rawurlencode('Re: your project enquiry ' . $r['ref']) . '">' . $e($r['email']) . '</a></p>'
    . '<form method="post" class="status"><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><label>Status <select name="status">' . $opts . '</select></label><label>Notes<textarea name="notes" rows="3">' . $e($r['notes']) . '</textarea></label><button>Save</button></form>'
    . '<h2>Brief</h2><pre>' . $e($r['brief']) . '</pre>'
    . ($r['blueprint'] ? '<h2>Visitor\'s blueprint</h2><pre>' . $e($r['blueprint']) . '</pre>' : '')
    . ($r['proposal'] ? '<h2>Internal proposal draft <small>AI-written — check every line; never sent to the client</small></h2><pre>' . $e($r['proposal']) . '</pre>' : ''));
}
$rows = $pdo->query('SELECT id, ref, created_at, status, name, company, industry, budget FROM inquiries ORDER BY id DESC LIMIT 300')->fetchAll();
$tr = implode('', array_map(fn($r) => '<tr><td><a href="?id=' . (int)$r['id'] . '">' . $e($r['ref']) . '</a></td><td>' . $e(substr($r['created_at'], 0, 10)) . '</td><td><span class="st st-' . $e(str_replace(' ', '-', $r['status'])) . '">' . $e($r['status']) . '</span></td><td>' . $e($r['name']) . '</td><td>' . $e($r['company']) . '</td><td>' . $e($r['industry']) . '</td><td>' . $e($r['budget']) . '</td></tr>', $rows));
page('Enquiries', '<h1>Enquiries <small>' . count($rows) . '</small></h1><p><a href="?csv=1">Export CSV</a> · <a href="?logout=1">Sign out</a></p><table><thead><tr><th>Ref</th><th>Date</th><th>Status</th><th>Name</th><th>Company</th><th>Industry</th><th>Budget</th></tr></thead><tbody>' . ($tr ?: '<tr><td colspan="7">No enquiries yet.</td></tr>') . '</tbody></table>');

function page(string $title, string $body): void {
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . htmlspecialchars($title) . '</title><style>'
    . 'body{font:15px/1.5 system-ui,sans-serif;max-width:1000px;margin:2rem auto;padding:0 1rem;color:#121212;background:#f7f4ee}a{color:#9e3f0a}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:.55rem .6rem;border-bottom:1px solid #e3ddd2;text-align:left}pre{white-space:pre-wrap;background:#0b1224;color:#f2eee6;padding:1rem;border-radius:8px}'
    . '.st{padding:.1rem .5rem;border-radius:99px;background:#eba83a33}.st-new{background:#eba83a}.st-won{background:#3fb87144}small{color:#666;font-weight:400;font-size:.8rem}.meta{color:#555}.status{display:grid;gap:.5rem;max-width:520px;background:#fff;padding:1rem;border-radius:8px}textarea,select,input{font:inherit;padding:.4rem;width:100%;box-sizing:border-box}button{font:inherit;padding:.5rem 1rem;background:#0b1224;color:#fff;border:0;border-radius:99px;cursor:pointer;justify-self:start}.login{display:grid;gap:.8rem;max-width:320px;margin:4rem auto}.err{color:#b3261e}'
    . '</style></head><body>' . $body . '</body></html>';
  exit;
}
