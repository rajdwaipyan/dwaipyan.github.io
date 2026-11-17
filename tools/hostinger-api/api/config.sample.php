<?php
// Copy this file to config.php (same folder) and fill it in. config.php is blocked from the web by .htaccess,
// and is never committed to GitHub. For extra safety you can move it one folder above public_html and change
// CONFIG_PATH at the top of lib.php.
return [
  // Who may call this API: your website's origin (scheme + host, no path).
  'allowed_origins' => ['https://rajdwaipyan.github.io'],

  // MySQL database created in hPanel → Databases. On Hostinger shared hosting the host is "localhost".
  'db_dsn'  => 'mysql:host=localhost;dbname=u000000000_solutions;charset=utf8mb4',
  'db_user' => 'u000000000_solutions',
  'db_pass' => 'CHANGE-ME',

  // Where new enquiries are emailed, and the sender address (create it in hPanel → Emails on your domain).
  'owner_email' => 'rajdwaipayan@gmail.com',
  'from_email'  => 'noreply@your-domain.com',

  // Admin page (admin.php). Generate a hash with:  php -r "echo password_hash('your password', PASSWORD_DEFAULT);"
  'admin_password_hash' => '',

  // A long random string used to hash visitors' IP addresses for rate limiting (IPs are never stored).
  'ip_salt' => 'CHANGE-ME-to-a-long-random-string',

  // Optional: forward every enquiry as JSON to an n8n or GoHighLevel inbound webhook. Leave '' to skip.
  'webhook_url' => '',

  // Optional AI (Anthropic Messages API). Leave ai_key '' to switch every AI feature off.
  'ai_key'   => '',
  'ai_model' => '',                                   // a current model id, see docs.claude.com → Models
  'ai_url'   => 'https://api.anthropic.com/v1/messages',
  'ai_proposal_draft' => true,                       // write an internal proposal draft for each enquiry (emailed to you only)

  // The public site, used by the twin endpoint to read assets/twin-knowledge.json.
  'site_url' => 'https://rajdwaipyan.github.io/dwaipyan.github.io/',

  // Per visitor (hashed IP) per day.
  'limits' => ['inquiry' => 5, 'blueprint' => 15, 'twin' => 60],
];
