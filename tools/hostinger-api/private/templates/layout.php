<?php
/**
 * Shared email shell. Table layout with inline styles so it renders in Gmail, Outlook, Apple Mail and phone apps;
 * a single 600px column that becomes full width on small screens. No images, no tracking pixels, no remote fonts.
 *
 * Variables: $preheader (hidden preview text), $eyebrow, $title, $content (trusted HTML built by the other
 * templates), $footer (trusted HTML), $brand (array from config).
 */
$e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$font = "'Avenir Next', Avenir, 'Helvetica Neue', Arial, sans-serif";
$body = "Roboto, 'Helvetica Neue', Arial, sans-serif";
?><!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title><?= $e($title) ?></title>
<style>
  @media (max-width: 620px) {
    .shell { width: 100% !important; }
    .pad { padding-left: 22px !important; padding-right: 22px !important; }
    .kv td { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-top: 2px !important; padding-right: 0 !important; }
    .kv td.k { padding-top: 12px !important; }
    .h1 { font-size: 24px !important; }
  }
  a { color: #9e3f0a; }
</style>
</head>
<body style="margin:0;padding:0;background:#f2eee6;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f2eee6;"><?= $e($preheader) ?>&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2eee6;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <!-- wordmark -->
      <tr><td class="pad" style="padding:0 32px 16px;font-family:<?= $font ?>;font-size:15px;font-weight:700;letter-spacing:-.01em;color:#121212;">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#eba83a;margin-right:8px;vertical-align:1px;"></span><?= $e($brand['name'] ?? '') ?>
      </td></tr>
      <!-- card -->
      <tr><td style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3ddd2;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="pad" style="background:#0b1224;padding:28px 32px 26px;">
            <p style="margin:0 0 10px;font-family:<?= $body ?>;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#eba83a;"><?= $e($eyebrow) ?></p>
            <h1 class="h1" style="margin:0;font-family:<?= $font ?>;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.03em;color:#f2eee6;"><?= $e($title) ?></h1>
          </td></tr>
          <tr><td class="pad" style="padding:28px 32px 30px;font-family:<?= $body ?>;font-size:15px;line-height:1.6;color:#2a2926;">
            <?= $content ?>
          </td></tr>
        </table>
      </td></tr>
      <!-- footer -->
      <tr><td class="pad" style="padding:18px 32px 0;font-family:<?= $body ?>;font-size:12px;line-height:1.6;color:#5d584e;">
        <?= $footer ?>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
