<?php
// Email delivery through authenticated SMTP with PHPMailer (bundled in vendor/phpmailer, LGPL-2.1).
declare(strict_types=1);

require_once API_HOME . '/vendor/phpmailer/src/Exception.php';
require_once API_HOME . '/vendor/phpmailer/src/PHPMailer.php';
require_once API_HOME . '/vendor/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

/** Text safe for a header: no line breaks or control characters (prevents header injection). */
function header_safe(string $s, int $max = 200): string {
  return mb_substr(trim(preg_replace('/[\x00-\x1F\x7F\x{2028}\x{2029}]+/u', ' ', $s) ?? ''), 0, $max);
}

/** A display name safe for an address header. */
function name_safe(string $s): string { return header_safe(str_replace(['"', '<', '>', '\\', ',', ';', ':'], '', $s), 80); }

/** A strict email check used for every address we send to or put in Reply-To. */
function email_ok(string $e): bool {
  return strlen($e) <= 160 && !preg_match('/[\r\n\s,;<>"]/', $e) && (bool)filter_var($e, FILTER_VALIDATE_EMAIL)
    && PHPMailer::validateAddress($e, 'html5') && str_contains(substr($e, strrpos($e, '@') + 1), '.');
}

/**
 * Build a configured PHPMailer. $debug (CLI only) prints the SMTP conversation with credentials redacted.
 */
function make_mailer(bool $debug = false): PHPMailer {
  $m = new PHPMailer(true);
  $m->isSMTP();
  $m->Host = (string)cfgv('smtp.host', '');
  $m->Port = (int)cfgv('smtp.port', 465);
  $secure = strtolower((string)cfgv('smtp.secure', 'ssl'));
  $m->SMTPSecure = $secure === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : ($secure === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : '');
  $m->SMTPAutoTLS = $secure !== 'none';
  $m->SMTPAuth = true;
  $m->Username = (string)cfgv('smtp.username', '');
  $m->Password = (string)cfgv('smtp.password', '');
  $m->Timeout = (int)cfgv('smtp.timeout', 15);
  $m->CharSet = PHPMailer::CHARSET_UTF8;
  $m->Encoding = PHPMailer::ENCODING_QUOTED_PRINTABLE;
  $m->XMailer = ' ';                                // don't advertise the mailer
  $host = parse_url((string)cfgv('brand.site_url', ''), PHP_URL_HOST);
  $fromDomain = substr((string)cfg('from_email'), strrpos((string)cfg('from_email'), '@') + 1);
  $m->Hostname = $fromDomain ?: ($host ?: 'localhost');
  if ($debug) {
    $m->SMTPDebug = SMTP::DEBUG_SERVER;
    $redactNext = 0;
    $m->Debugoutput = function (string $line) use (&$redactNext) {
      $line = rtrim($line);
      if (preg_match('/CLIENT -> SERVER: AUTH\b/i', $line)) {
        $line = preg_replace('/(AUTH \S+)\s+\S+/i', '$1 [redacted]', $line);
        $redactNext = 2;
      } elseif ($redactNext > 0 && str_contains($line, 'CLIENT -> SERVER:')) {
        $line = 'CLIENT -> SERVER: [redacted]'; $redactNext--;
      }
      echo $line, "\n";
    };
  }
  $m->setFrom((string)cfg('from_email'), name_safe((string)cfg('from_name')), false);
  return $m;
}

/** Map a PHPMailer error to a short category that is safe to store and show to the owner. */
function mail_error_category(string $info): string {
  $i = strtolower($info);
  return match (true) {
    str_contains($i, 'authenticate') || str_contains($i, 'auth') && str_contains($i, '535') => 'smtp_auth_failed',
    str_contains($i, 'connect') || str_contains($i, 'timed out') || str_contains($i, 'getaddrinfo') => 'smtp_connect_failed',
    str_contains($i, 'recipient') || str_contains($i, 'rcpt') || str_contains($i, '550') => 'recipient_rejected',
    str_contains($i, 'sender') || str_contains($i, 'from') => 'sender_rejected',
    str_contains($i, 'invalid address') => 'invalid_address',
    default => 'smtp_error',
  };
}

/**
 * Send one email. $to/$replyTo are [email, name]. Returns ['ok' => bool, 'error' => category|null].
 * Never throws. Only the error category and a scrubbed detail are logged — never credentials or content.
 */
function send_mail(array $to, string $subject, string $html, string $text, ?array $replyTo = null, array $headers = []): array {
  if (!email_ok((string)$to[0])) return ['ok' => false, 'error' => 'invalid_address'];
  try {
    $m = make_mailer();
    $m->addAddress((string)$to[0], name_safe((string)($to[1] ?? '')));
    if ($replyTo && email_ok((string)$replyTo[0])) $m->addReplyTo((string)$replyTo[0], name_safe((string)($replyTo[1] ?? '')));
    foreach ($headers as $k => $v) $m->addCustomHeader(header_safe((string)$k, 60), header_safe((string)$v, 200));
    $m->Subject = header_safe($subject, 180);
    $m->isHTML(true);
    $m->Body = $html;
    $m->AltBody = $text;
    $m->send();
    return ['ok' => true, 'error' => null];
  } catch (\Throwable $e) {
    $info = isset($m) ? (string)$m->ErrorInfo : $e->getMessage();
    $cat = mail_error_category($info . ' ' . $e->getMessage());
    $pass = (string)cfgv('smtp.password', '');
    $detail = $pass !== '' ? str_replace($pass, '[redacted]', $info) : $info;
    log_event('error', 'mail_failed', ['category' => $cat, 'to' => mask_email((string)$to[0]), 'detail' => $detail]);
    return ['ok' => false, 'error' => $cat];
  }
}

/** Connect and authenticate without sending anything. Returns '' or an error category. */
function smtp_check(): string {
  try {
    $m = make_mailer();
    if (!$m->smtpConnect()) return 'smtp_connect_failed';
    $m->smtpClose();
    return '';
  } catch (\Throwable $e) {
    return mail_error_category((isset($m) ? $m->ErrorInfo : '') . ' ' . $e->getMessage());
  }
}
