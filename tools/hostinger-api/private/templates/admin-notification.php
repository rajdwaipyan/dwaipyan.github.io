<?php
/**
 * Owner notification. Returns ['subject', 'html', 'text'].
 * Variables: $s (the stored submission, already validated), $source (label), $brand, $when (formatted local time),
 * $whenUtc, $proposal (optional AI draft, owner only).
 */
$e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$nl = fn($v) => nl2br($e($v), false);
$font = "'Avenir Next', Avenir, 'Helvetica Neue', Arial, sans-serif";

$rows = [
  'Name' => $s['name'],
  'Email' => $s['email'],
  'Phone' => $s['phone'] ?: '—',
  'Business' => $s['company'] ?: '—',
  'Services' => $s['services'] ?: '—',
  'Budget' => $s['budget'] ?: '—',
  'Timeline' => $s['timeline'] ?: '—',
  'Submitted' => $when,
  'Form' => $source,
  'Reference' => $s['ref'],
];
$extra = [];
foreach (($s['details_arr'] ?? []) as $k => $v) if ($v !== '') $extra[ucfirst(str_replace('_', ' ', (string)$k))] = $v;

// the visitor's blueprint arrives as markdown: show a short, plain summary (the full text is in the admin inbox)
$bpShort = '';
if ($s['blueprint']) {
  $plain = preg_replace(['/^#{1,6}\s*/m', '/^>\s*/m', '/\*\*|__|(?<!\w)_(?!\s)|(?<!\s)_(?!\w)/', '/\n{2,}/'], ['', '', '', "\n"], $s['blueprint']) ?? '';
  $bpShort = mb_strlen($plain) > 1400 ? rtrim(mb_substr($plain, 0, 1400)) . ' …' : $plain;
}
$replySubject = 'Re: your enquiry ' . $s['ref'];
$mailto = 'mailto:' . rawurlencode($s['email']) . '?subject=' . rawurlencode($replySubject);

$kv = function (array $pairs) use ($e): string {
  $h = '<table role="presentation" class="kv" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e3ddd2;">';
  foreach ($pairs as $k => $v) {
    $val = $k === 'Email' ? '<a href="mailto:' . $e($v) . '" style="color:#9e3f0a;">' . $e($v) . '</a>' : $e($v);
    $h .= '<tr><td class="k" width="130" valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid #e3ddd2;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5d584e;">' . $e($k) . '</td>'
        . '<td valign="top" style="padding:10px 0;border-bottom:1px solid #e3ddd2;font-size:15px;color:#121212;">' . $val . '</td></tr>';
  }
  return $h . '</table>';
};
$block = fn(string $title, string $html, string $bg = '#faf8f3') =>
  '<p style="margin:26px 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5d584e;">' . $e($title) . '</p>'
  . '<div style="background:' . $bg . ';border:1px solid #e3ddd2;border-radius:12px;padding:16px 18px;font-size:15px;line-height:1.6;color:#121212;">' . $html . '</div>';

$content = '<p style="margin:0 0 18px;">A new enquiry arrived from your website. Reply to this email to answer ' . $e($s['name']) . ' directly.</p>'
  . $kv($rows)
  . $block('Project description', $nl($s['message']))
  . ($extra ? '<p style="margin:26px 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5d584e;">More details</p>' . $kv($extra) : '')
  . ($s['blueprint'] ? $block('Their Business Builder blueprint — summary (full version in your admin inbox)', '<div style="font-size:13px;line-height:1.55;">' . $nl($bpShort) . '</div>') : '')
  . (!empty($proposal) ? $block('Internal proposal draft — AI-written, not sent to the client', '<div style="font-size:13px;">' . $nl($proposal) . '</div>', '#fff7e8') : '')
  . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;"><tr><td style="border-radius:999px;background:#0b1224;">'
  . '<a href="' . $e($mailto) . '" style="display:inline-block;padding:12px 22px;font-family:' . $font . ';font-size:15px;font-weight:700;color:#f2eee6;text-decoration:none;">Reply to ' . $e(strtok($s['name'], ' ')) . ' →</a>'
  . '</td></tr></table>'
  . '<p style="margin:18px 0 0;font-size:13px;color:#5d584e;">Consent to be contacted: ' . ($s['consent'] ? 'given on the form' : 'not asked on this form') . ' · Page: ' . $e($s['page'] ?: '—') . '</p>';

$footer = 'Sent by your website’s enquiry system to the business inbox in its configuration. Times are shown in Dhaka time (' . $e($whenUtc) . ' UTC).';

$html = (function () use ($content, $footer, $brand, $s, $source) {
  $preheader = $s['name'] . ' — ' . mb_substr(preg_replace('/\s+/', ' ', $s['message']), 0, 90);
  $eyebrow = 'New enquiry · ' . $source;
  $title = $s['company'] ?: $s['name'];
  ob_start(); include __DIR__ . '/layout.php'; return (string)ob_get_clean();
})();

$text = "NEW ENQUIRY — {$source}\nReference: {$s['ref']}\n\n";
foreach ($rows as $k => $v) $text .= str_pad($k . ':', 12) . $v . "\n";
$text .= "\nPROJECT DESCRIPTION\n" . $s['message'] . "\n";
if ($extra) { $text .= "\nMORE DETAILS\n"; foreach ($extra as $k => $v) $text .= "$k: $v\n"; }
if ($s['blueprint']) $text .= "\nTHEIR BUSINESS BUILDER BLUEPRINT — summary (full version in your admin inbox)\n" . $bpShort . "\n";
if (!empty($proposal)) $text .= "\nINTERNAL PROPOSAL DRAFT (AI-written, not sent to the client)\n" . $proposal . "\n";
$text .= "\nConsent to be contacted: " . ($s['consent'] ? 'given on the form' : 'not asked on this form') . "\nPage: " . ($s['page'] ?: '—') . "\n\nReply to this email to answer {$s['name']} directly.\n";

return [
  'subject' => 'New enquiry: ' . $source . ' — ' . ($s['company'] ? $s['name'] . ', ' . $s['company'] : $s['name']) . ' [' . $s['ref'] . ']',
  'html' => $html,
  'text' => $text,
];
