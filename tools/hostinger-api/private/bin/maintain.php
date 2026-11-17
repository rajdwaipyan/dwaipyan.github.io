<?php
// Maintenance for a Hostinger cron job (hPanel → Advanced → Cron Jobs), e.g. every 15 minutes:
//   /usr/bin/php /home/u123456789/portfolio-api/bin/maintain.php
// Resends emails that failed (up to 5 attempts, for 3 days), deletes old rate-limit rows, and deletes submissions
// older than retention_days.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';

$pdo = db();
$retried = retry_failed(5);
$pdo->prepare('DELETE FROM rate_hits WHERE exp < ?')->execute([time()]);
$purged = 0;
if (($days = (int)cfg('retention_days')) > 0) {
  $st = $pdo->prepare('DELETE FROM submissions WHERE created_at < ?'); $st->execute([gmdate('c', time() - $days * 86400)]);
  $purged = $st->rowCount();
}
log_event('info', 'maintain', ['retried' => $retried, 'purged' => $purged]);
echo "retried $retried, purged $purged\n";
