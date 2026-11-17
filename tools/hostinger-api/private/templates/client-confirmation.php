<?php
/**
 * Acknowledgment to the person who submitted the form. Returns ['subject', 'html', 'text'].
 *
 * Deliberately does NOT repeat their free-text message: the address is typed by the visitor, so echoing arbitrary
 * text would let someone use this form to send their own content to other people. Only the structured choices,
 * the reference and their first name appear (names are validated to contain no links or addresses).
 *
 * Variables: $s (stored submission), $source (label), $brand, $responseTime ('' = make no promise), $ownerName.
 */
$e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$first = trim((string)strtok($s['name'], ' ')) ?: $s['name'];

$summary = ['Reference' => $s['ref'], 'Form' => $source];
if ($s['services']) $summary['Services'] = $s['services'];
if ($s['budget']) $summary['Budget'] = $s['budget'];
if ($s['timeline']) $summary['Timeline'] = $s['timeline'];

$rowsHtml = '';
foreach ($summary as $k => $v) {
  $rowsHtml .= '<tr><td class="k" width="120" valign="top" style="padding:9px 12px 9px 0;border-bottom:1px solid #e3ddd2;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5d584e;">' . $e($k) . '</td>'
    . '<td valign="top" style="padding:9px 0;border-bottom:1px solid #e3ddd2;font-size:15px;color:#121212;">' . $e($v) . '</td></tr>';
}

$when = $responseTime !== '' ? ' I aim to reply ' . $e($responseTime) . '.' : '';
$wa = (string)($brand['whatsapp'] ?? '');

$content = '<p style="margin:0 0 14px;">Hi ' . $e($first) . ',</p>'
  . '<p style="margin:0 0 14px;">Thank you for getting in touch. Your enquiry has reached me, and I read every message personally.' . $when . '</p>'
  . '<p style="margin:0 0 20px;">If you’d like to add anything — files, links or more detail — simply reply to this email and it will come straight to me.</p>'
  . '<table role="presentation" class="kv" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e3ddd2;">' . $rowsHtml . '</table>'
  . '<p style="margin:24px 0 0;">Best regards,<br><strong style="color:#121212;">' . $e($ownerName) . '</strong><br><span style="color:#5d584e;">' . $e($brand['tagline'] ?? '') . '</span></p>'
  . '<p style="margin:16px 0 0;font-size:14px;"><a href="' . $e($brand['site_url'] ?? '') . '" style="color:#9e3f0a;">Website</a>'
  . ($wa !== '' ? ' &nbsp;·&nbsp; <a href="' . $e($wa) . '" style="color:#9e3f0a;">WhatsApp</a>' : '') . '</p>';

$footer = 'You received this email because this address was entered on a form at ' . $e(parse_url((string)($brand['site_url'] ?? ''), PHP_URL_HOST) ?: 'my website')
  . '. If that wasn’t you, you can ignore it — nothing else will be sent.';

$html = (function () use ($content, $footer, $brand, $s, $first) {
  $preheader = 'Thank you, ' . $first . ' — your enquiry ' . $s['ref'] . ' has been received.';
  $eyebrow = 'Enquiry received';
  $title = 'Thank you, ' . $first . '.';
  ob_start(); include __DIR__ . '/layout.php'; return (string)ob_get_clean();
})();

$text = "Hi {$first},\n\nThank you for getting in touch. Your enquiry has reached me, and I read every message personally."
  . ($responseTime !== '' ? " I aim to reply {$responseTime}." : '') . "\n\n"
  . "If you'd like to add anything — files, links or more detail — simply reply to this email.\n\n";
foreach ($summary as $k => $v) $text .= str_pad($k . ':', 11) . $v . "\n";
$text .= "\nBest regards,\n{$ownerName}\n" . ($brand['tagline'] ?? '') . "\n" . ($brand['site_url'] ?? '') . "\n"
  . ($wa !== '' ? "WhatsApp: {$wa}\n" : '')
  . "\n—\nYou received this email because this address was entered on a form on my website. If that wasn't you, you can ignore it.\n";

return [
  'subject' => 'Thank you — your enquiry has been received [' . $s['ref'] . ']',
  'html' => $html,
  'text' => $text,
];
