<?php
// Owner inbox: list and read submissions, see whether each email was delivered, resend, set status and notes,
// export CSV, check the SMTP connection and send a test email. Password hash lives in ~/portfolio-api/config.php.
declare(strict_types=1);
require (require __DIR__ . '/locate.php');

session_name('pfadmin');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']), 'samesite' => 'Strict', 'path' => dirname($_SERVER['SCRIPT_NAME'] ?? '/') ?: '/']);
session_start();
header('X-Frame-Options: DENY'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer'); header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
$e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($post && !hash_equals($csrf, (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Bad request'); }
$hidden = '<input type="hidden" name="csrf" value="' . $csrf . '">';

// ── sign in (slowed down, and locked for 15 minutes after 8 wrong passwords from one address) ──
if (empty($_SESSION['admin'])) {
  $err = '';
  if ($post && isset($_POST['password'])) {
    usleep(500000);
    $locked = false;
    try { $locked = over_limit('admin:' . ip_hash(), 8, 900); } catch (\Throwable $x) {}
    $hash = (string)cfg('admin_password_hash');
    if ($locked) $err = 'Too many attempts. Try again in 15 minutes.';
    elseif ($hash !== '' && password_verify((string)$_POST['password'], $hash)) {
      session_regenerate_id(true); $_SESSION['admin'] = 1; $_SESSION['csrf'] = bin2hex(random_bytes(16));
      log_event('info', 'admin_login'); header('Location: admin.php'); exit;
    } else { $err = $hash === '' ? 'Set admin_password_hash in config.php first.' : 'Wrong password.'; log_event('warn', 'admin_login_failed'); }
  }
  page('Sign in', '<form method="post" class="login"><h1>Enquiries</h1><label>Password <input type="password" name="password" autocomplete="current-password" autofocus required></label>' . $hidden . '<button>Sign in</button>' . ($err ? '<p class="err">' . $e($err) . '</p>' : '') . '</form>');
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: admin.php'); exit; }

$pdo = db();
$statuses = ['new', 'replied', 'in discussion', 'proposal sent', 'won', 'closed', 'spam'];
$flash = $_SESSION['flash'] ?? ''; unset($_SESSION['flash']);

if ($post) {
  $act = (string)($_POST['act'] ?? '');
  $id = (int)($_POST['id'] ?? 0);
  if ($act === 'save' && $id) {
    $status = in_array($_POST['status'] ?? '', $statuses, true) ? $_POST['status'] : 'new';
    $pdo->prepare('UPDATE submissions SET status = ?, notes = ? WHERE id = ?')->execute([$status, text($_POST['notes'] ?? '', 5000), $id]);
    back("admin.php?id=$id", 'Saved.');
  }
  if ($act === 'resend' && $id) {
    retry_failed(99, $id);
    $st = $pdo->prepare('SELECT admin_mail FROM submissions WHERE id = ?'); $st->execute([$id]);
    back("admin.php?id=$id", $st->fetchColumn() === 'sent' ? 'Notification sent again to your inbox.' : 'Sending failed again — see the error below.');
  }
  if ($act === 'smtp') {
    $r = smtp_check();
    back('admin.php?tools=1', $r === '' ? 'SMTP connection and login succeeded.' : 'SMTP check failed: ' . $r . ' (details in logs/app.log).');
  }
  if ($act === 'test') {
    $to = strtolower(line($_POST['to'] ?? '', 160)) ?: (string)cfg('owner_email');
    if (!email_ok($to)) back('admin.php?tools=1', 'That address is not valid.');
    $r = send_mail([$to, ''], 'Test email from your website (' . gmdate('Y-m-d H:i') . ' UTC)',
      '<p style="font-family:Arial,sans-serif">This is a test from your website’s email system. If you can read it, SMTP delivery works.</p>',
      "This is a test from your website's email system. If you can read it, SMTP delivery works.");
    log_event($r['ok'] ? 'info' : 'error', 'test_email', ['to' => mask_email($to), 'ok' => $r['ok']]);
    back('admin.php?tools=1', $r['ok'] ? "Test email accepted by the SMTP server for $to. Check that inbox (and spam)." : 'Test email failed: ' . $r['error'] . '.');
  }
}

if (isset($_GET['csv'])) {
  header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="enquiries-' . gmdate('Y-m-d') . '.csv"');
  $out = fopen('php://output', 'w');
  $cols = ['ref', 'created_at', 'source', 'status', 'name', 'email', 'phone', 'company', 'services', 'budget', 'timeline', 'message', 'admin_mail', 'client_mail'];
  fputcsv($out, $cols);
  foreach ($pdo->query('SELECT ' . implode(',', $cols) . ' FROM submissions ORDER BY id DESC') as $r)
    fputcsv($out, array_map(fn($v) => preg_match('/^[=+\-@\t\r]/', (string)$v) ? "'" . $v : $v, $r));   // no spreadsheet formulas
  exit;
}

$labels = sources();
$badge = fn(string $v) => '<span class="mail mail-' . $e($v) . '">' . $e($v) . '</span>';
$note = $flash !== '' ? '<p class="flash">' . $e($flash) . '</p>' : '';
$nav = '<p class="nav"><a href="admin.php">Enquiries</a> · <a href="?tools=1">Email tools</a> · <a href="?csv=1">Export CSV</a> · <a href="?logout=1">Sign out</a></p>';

if (isset($_GET['tools'])) {
  $problems = config_problems();
  page('Email tools', $nav . $note . '<h1>Email tools</h1>'
    . '<p>Sending from <b>' . $e(cfg('from_email')) . '</b> through <b>' . $e(cfgv('smtp.host')) . ':' . $e(cfgv('smtp.port')) . '</b> (' . $e(cfgv('smtp.secure')) . '). Notifications go to <b>' . $e(cfg('owner_email')) . '</b>.</p>'
    . ($problems ? '<p class="err">Still to fill in config.php: ' . $e(implode(', ', $problems)) . '</p>' : '<p>Configuration: complete.</p>')
    . (home_is_public() ? '<p class="err">Warning: the private folder is inside the public web root. Move it outside public_html.</p>' : '')
    . '<form method="post" class="box">' . $hidden . '<input type="hidden" name="act" value="smtp"><p>Connect and log in to the SMTP server without sending anything.</p><button>Check SMTP connection</button></form>'
    . '<form method="post" class="box">' . $hidden . '<input type="hidden" name="act" value="test"><label>Send a test email to <input type="email" name="to" placeholder="' . $e(cfg('owner_email')) . '"></label><button>Send test email</button></form>');
}

if (isset($_GET['id'])) {
  $st = $pdo->prepare('SELECT * FROM submissions WHERE id = ?'); $st->execute([(int)$_GET['id']]); $r = $st->fetch();
  if (!$r) { header('Location: admin.php'); exit; }
  $opts = implode('', array_map(fn($s) => '<option' . ($s === $r['status'] ? ' selected' : '') . '>' . $s . '</option>', $statuses));
  $details = json_decode((string)$r['details'], true) ?: [];
  $dl = '';
  foreach (['Email' => '<a href="mailto:' . $e($r['email']) . '?subject=' . rawurlencode('Re: your enquiry ' . $r['ref']) . '">' . $e($r['email']) . '</a>', 'Phone' => $e($r['phone'] ?: '—'), 'Business' => $e($r['company'] ?: '—'),
    'Services' => $e($r['services'] ?: '—'), 'Budget' => $e($r['budget'] ?: '—'), 'Timeline' => $e($r['timeline'] ?: '—'), 'Form' => $e($labels[$r['source']] ?? $r['source']),
    'Received' => $e($r['created_at']) . ' UTC', 'Page' => $e($r['page'] ?: '—'), 'Consent' => $r['consent'] ? 'given' : 'not asked'] as $k => $v) $dl .= "<dt>$k</dt><dd>$v</dd>";
  foreach ($details as $k => $v) $dl .= '<dt>' . $e(ucfirst(str_replace('_', ' ', $k))) . '</dt><dd>' . $e($v) . '</dd>';
  page($r['ref'], $nav . $note . '<h1>' . $e($r['name']) . ' <small>' . $e($r['ref']) . '</small></h1>'
    . '<p>Notification ' . $badge($r['admin_mail']) . ' · Confirmation ' . $badge($r['client_mail']) . ($r['mail_error'] ? ' · last error: <code>' . $e($r['mail_error']) . '</code>' : '') . '</p>'
    . '<form method="post" class="inline">' . $hidden . '<input type="hidden" name="act" value="resend"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><button class="ghost">Resend notification to my inbox</button></form>'
    . '<dl>' . $dl . '</dl><h2>Message</h2><pre>' . $e($r['message']) . '</pre>'
    . ($r['blueprint'] ? '<h2>Business Builder blueprint</h2><pre>' . $e($r['blueprint']) . '</pre>' : '')
    . ($r['proposal'] ? '<h2>Internal proposal draft <small>AI-written — check every line</small></h2><pre>' . $e($r['proposal']) . '</pre>' : '')
    . '<form method="post" class="box">' . $hidden . '<input type="hidden" name="act" value="save"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><label>Status <select name="status">' . $opts . '</select></label><label>Notes<textarea name="notes" rows="3">' . $e($r['notes']) . '</textarea></label><button>Save</button></form>');
}

$rows = $pdo->query('SELECT id, ref, created_at, source, status, name, company, admin_mail, client_mail FROM submissions ORDER BY id DESC LIMIT 300')->fetchAll();
$tr = implode('', array_map(fn($r) => '<tr><td><a href="?id=' . (int)$r['id'] . '">' . $e($r['ref']) . '</a></td><td>' . $e(substr($r['created_at'], 0, 10)) . '</td><td>' . $e($labels[$r['source']] ?? $r['source']) . '</td><td>' . $e($r['name']) . ($r['company'] ? '<br><small>' . $e($r['company']) . '</small>' : '') . '</td><td><span class="st">' . $e($r['status']) . '</span></td><td>' . $badge($r['admin_mail']) . ' ' . $badge($r['client_mail']) . '</td></tr>', $rows));
page('Enquiries', $nav . $note . '<h1>Enquiries <small>' . count($rows) . '</small></h1><table><thead><tr><th>Ref</th><th>Date</th><th>Form</th><th>From</th><th>Status</th><th>Emails <small>you · them</small></th></tr></thead><tbody>' . ($tr ?: '<tr><td colspan="6">No enquiries yet.</td></tr>') . '</tbody></table>');

function back(string $to, string $msg = ''): void {
  if ($msg !== '') $_SESSION['flash'] = $msg;
  header('Location: ' . $to);
  exit;
}

function page(string $title, string $body): void {
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' . htmlspecialchars($title) . '</title><style>'
    . 'body{font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:1040px;margin:2rem auto;padding:0 1rem;color:#121212;background:#f2eee6}a{color:#9e3f0a}h1{letter-spacing:-.02em}small{color:#5d584e;font-weight:400;font-size:.8rem}'
    . 'table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden}th,td{padding:.6rem .7rem;border-bottom:1px solid #e3ddd2;text-align:left;vertical-align:top}th{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:#5d584e}'
    . 'pre{white-space:pre-wrap;background:#fff;border:1px solid #e3ddd2;padding:1rem;border-radius:10px;font:14px/1.55 inherit}dl{display:grid;grid-template-columns:9rem 1fr;gap:.35rem 1rem;background:#fff;padding:1rem;border-radius:10px}dt{color:#5d584e;font-size:.85rem}dd{margin:0}'
    . '.mail{display:inline-block;padding:.05rem .5rem;border-radius:99px;font-size:.75rem;background:#e3ddd2}.mail-sent{background:#3fb87133}.mail-failed{background:#b3261e22;color:#b3261e}.st{padding:.05rem .5rem;border-radius:99px;background:#eba83a55;font-size:.8rem}'
    . '.box{display:grid;gap:.6rem;max-width:560px;background:#fff;padding:1rem;border-radius:10px;margin:1rem 0}.inline{margin:.5rem 0 1rem}textarea,select,input{font:inherit;padding:.45rem;width:100%;box-sizing:border-box;border:1px solid #cfc7b8;border-radius:6px}'
    . 'button{font:inherit;padding:.5rem 1.1rem;background:#0b1224;color:#f2eee6;border:0;border-radius:99px;cursor:pointer;justify-self:start}button.ghost{background:none;color:#0b1224;box-shadow:inset 0 0 0 1px #0b1224}'
    . '.login{display:grid;gap:.8rem;max-width:320px;margin:4rem auto}.err{color:#b3261e}.flash{background:#fff;border-left:4px solid #eba83a;padding:.6rem .9rem;border-radius:6px}.nav{font-size:.9rem}code{font-size:.85rem}'
    . '</style></head><body>' . $body . '</body></html>';
  exit;
}
