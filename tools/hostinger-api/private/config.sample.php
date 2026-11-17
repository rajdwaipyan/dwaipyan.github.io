<?php
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Portfolio API — configuration TEMPLATE.
//
// On Hostinger: copy this file to  ~/portfolio-api/config.php  (your home folder, OUTSIDE public_html) and fill it
// in there. Never put the real config.php in GitHub or inside public_html.
//
// Every value can instead come from an environment variable (the getenv() calls below), if your host provides them.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
$env = fn(string $k, $default = '') => (($v = getenv($k)) !== false && $v !== '') ? $v : $default;

return [
  // Websites allowed to call this API (scheme + host, no path). Requests from anywhere else are refused.
  'allowed_origins' => ['https://rajdwaipyan.github.io'],

  // ── Email (SMTP) ──────────────────────────────────────────────────────────────────────────────────────────
  // Create the mailbox first: hPanel → Emails → your domain → Create email account (e.g. noreply@your-domain).
  // Hostinger: smtp.hostinger.com, port 465 with 'ssl'  (or port 587 with 'tls').
  'smtp' => [
    'host'     => $env('SMTP_HOST', 'smtp.hostinger.com'),
    'port'     => (int)$env('SMTP_PORT', '465'),
    'secure'   => $env('SMTP_SECURE', 'ssl'),          // 'ssl' (port 465) or 'tls' (port 587)
    'username' => $env('SMTP_USER', 'noreply@your-domain.com'),
    'password' => $env('SMTP_PASS', 'CHANGE-ME'),
    'timeout'  => 15,
  ],
  // The sender. MUST be an address on your own domain — normally the same mailbox as smtp.username.
  // Visitors' addresses are never used as the sender; they are set as Reply-To on your notification.
  'from_email' => $env('MAIL_FROM', 'noreply@your-domain.com'),
  'from_name'  => 'Dwaipyan Mandal',
  // Your business inbox: every submission is emailed here. Replies to the visitor's confirmation go here too.
  'owner_email' => $env('MAIL_OWNER', 'you@your-domain.com'),
  'owner_name'  => 'Dwaipyan Mandal',
  // Send visitors an acknowledgment email.
  'send_confirmation' => true,
  // Only if you want the confirmation to state a response time, e.g. 'within two working days'. '' = say nothing.
  'response_time' => '',
  // Signature and links shown in emails.
  'brand' => [
    'name'     => 'Dwaipyan Mandal',
    'tagline'  => 'Web, CRM automation & cybersecurity — Dhaka, Bangladesh',
    'site_url' => 'https://rajdwaipyan.github.io/dwaipyan.github.io/',
    'whatsapp' => '',                                  // e.g. 'https://wa.me/8801XXXXXXXXX' — '' to leave out
  ],

  // ── Cloudflare Turnstile (spam protection) ───────────────────────────────────────────────────────────────
  // dash.cloudflare.com → Turnstile → Add widget → hostname rajdwaipyan.github.io. The SITE key goes in the
  // website's _data/forms.yml; the SECRET key goes only here.
  'turnstile_secret'   => $env('TURNSTILE_SECRET', ''),
  'turnstile_required' => true,                        // refuse submissions without a valid Turnstile token

  // ── Database (MySQL) ─────────────────────────────────────────────────────────────────────────────────────
  // hPanel → Databases → MySQL Databases. On Hostinger the host is "localhost". Tables are created automatically.
  'db_dsn'  => $env('DB_DSN', 'mysql:host=localhost;dbname=u000000000_portfolio;charset=utf8mb4'),
  'db_user' => $env('DB_USER', 'u000000000_portfolio'),
  'db_pass' => $env('DB_PASS', 'CHANGE-ME'),
  // Delete submissions older than this many days (run by bin/maintain.php). 0 = keep forever.
  'retention_days' => 365,

  // ── Secrets used for hashing and signing ─────────────────────────────────────────────────────────────────
  // Two DIFFERENT long random strings. Generate each with:  php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
  'ip_salt'     => $env('IP_SALT', 'CHANGE-ME'),      // hashes visitors' IPs for rate limits (IPs are never stored)
  'form_secret' => $env('FORM_SECRET', 'CHANGE-ME'),  // signs the short-lived form tokens

  // Owner inbox at /api/admin.php. Generate:  php -r "echo password_hash('a long password', PASSWORD_DEFAULT), PHP_EOL;"
  'admin_password_hash' => $env('ADMIN_PASSWORD_HASH', ''),

  // ── Limits ───────────────────────────────────────────────────────────────────────────────────────────────
  'limits' => [
    'submit_per_hour'      => 5,     // per visitor (hashed IP)
    'submit_per_day'       => 12,    // per visitor (hashed IP)
    'submit_per_email_day' => 4,     // per submitter email address
    'min_fill_seconds'     => 3,     // faster than this looks like a bot
    'duplicate_minutes'    => 30,    // the same person sending the same message again within this window is a duplicate
    'blueprint'            => 15,    // AI notes per visitor per day
    'twin'                 => 60,    // AI twin questions per visitor per day
  ],

  // ── Optional ─────────────────────────────────────────────────────────────────────────────────────────────
  // Forward every submission as JSON to an n8n or GoHighLevel inbound webhook. '' = off.
  'webhook_url' => $env('WEBHOOK_URL', ''),
  // Anthropic API for AI features. '' = every AI feature off.
  'ai_key'   => $env('AI_KEY', ''),
  'ai_model' => $env('AI_MODEL', ''),                  // a current model id — see docs.claude.com → Models
  'ai_url'   => 'https://api.anthropic.com/v1/messages',
  'ai_proposal_draft' => false,                        // AI-written internal proposal outline in your notification
  // The public site, used by the twin endpoint to read assets/twin-knowledge.json.
  'site_url' => 'https://rajdwaipyan.github.io/dwaipyan.github.io/',
];
