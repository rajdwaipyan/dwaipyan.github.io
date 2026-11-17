# Email system for the portfolio — PHP + PHPMailer on Hostinger

The website stays on GitHub Pages (static). This small PHP API runs on your Hostinger Premium shared hosting and
gives every form on the site the same secure pipeline:

```
visitor's browser ──HTTPS──▶  /api/token   (signed form token, fetched when they start typing)
                  ──HTTPS──▶  /api/submit  ──▶ validate ─▶ spam checks ─▶ store (MySQL) ─▶ SMTP (PHPMailer)
                                                                                   ├─▶ notification to your inbox
                                                                                   └─▶ confirmation to the visitor
```

| Form on the site | Source name in emails |
|---|---|
| Home page contact form — Website / Online store / Web app / CRM | Contact form |
| Home page — *Partnership* | Partnership request |
| Home page — *Academic* | Collaboration request |
| AI Prompt Engineering page enquiry | Consultation request |
| Business Solutions → project inquiry | Project request |
| Business Solutions → inquiry sent with a Business Builder blueprint | AI Business Builder |
| (spare, for future forms) | Business inquiry |

**Until you switch it on, nothing changes on the website.** With `endpoint` empty in `_data/forms.yml`, the forms look
and behave exactly as before (they open the visitor's email app or WhatsApp). When you set it, the forms gain an email
field (home and AI page — needed for the confirmation), an optional phone field, an invisible spam check, and a
“Send” button. If the API is ever unreachable, each form offers the email-app route instead, so no enquiry is lost.

---

## What goes where

```
tools/hostinger-api/
├── public/                 → upload to  public_html/api/      (the only web-reachable part)
│   ├── index.php           routes: /health /token /submit /blueprint /twin
│   ├── admin.php           your enquiry inbox + email tools
│   ├── locate.php          finds the private folder (not reachable from the web)
│   └── .htaccess           HTTPS only, clean routes, blocks everything else
└── private/                → upload to  ~/portfolio-api/       (your HOME folder — OUTSIDE public_html)
    ├── bootstrap.php
    ├── config.sample.php   template — copy to config.php ON THE SERVER and fill in
    ├── src/                lib, security (tokens, Turnstile), mailer (PHPMailer), forms, ai
    ├── templates/          HTML + plain-text emails (layout, admin-notification, client-confirmation)
    ├── vendor/phpmailer/   PHPMailer 7.2.0 (LGPL-2.1), unmodified — no Composer needed
    ├── bin/send-test.php   send a real test email from SSH
    ├── bin/maintain.php    cron: retry failed emails, delete old data
    └── logs/               app.log (created automatically; no message text, no passwords)
```

On Hostinger the result looks like this (your username differs):

```
/home/u123456789/
├── portfolio-api/                          ← private/  (+ config.php you create here)
└── domains/your-domain.com/public_html/
    └── api/                                ← public/
```

`index.php` finds `portfolio-api/` by looking in each parent folder, so no server path is written in a public file.
(If you prefer another place, set the environment variable `PORTFOLIO_API_HOME`.)

**GitHub holds only source code and `config.sample.php`.** `config.php`, logs and databases are in `.gitignore`.
The only Turnstile value that goes in the repository is the public *site key*.

---

## Setup (about 45 minutes, once)

### 1. Sender mailbox and email authentication (deliverability)
1. hPanel → **Emails** → your domain → **Create email account**: e.g. `noreply@your-domain.com` (strong password).
   This is the SMTP login *and* the From address. Your notifications can go to any inbox (your Gmail is fine).
2. hPanel → **Emails** → your domain → **Email delivery / DNS**: make sure these are set (use “Set to default” if
   Hostinger offers it). Without them, confirmations to Gmail/Outlook are likely to land in spam.
   - SPF — TXT `@` → `v=spf1 include:_spf.mail.hostinger.com ~all` (only one SPF record per domain — merge if one exists)
   - DKIM — the three CNAMEs `hostingermail-a/b/c._domainkey` → `hostingermail-a/b/c.dkim.mail.hostinger.com`
   - DMARC — TXT `_dmarc` → start with `v=DMARC1; p=none; rua=mailto:you@your-domain.com`

### 2. Database
hPanel → **Databases → MySQL Databases** → create a database and user. Note the names and password.
Tables (`submissions`, `rate_hits`) are created automatically on the first request.

### 3. Cloudflare Turnstile (free)
dash.cloudflare.com → **Turnstile** → **Add widget** → hostname `rajdwaipyan.github.io` (add your own domain too if the
site moves) → mode **Managed**. Copy the **site key** (public) and the **secret key** (private).

### 4. PHP version
hPanel → **Advanced → PHP Configuration** → PHP **8.1 or newer** (8.3 recommended).

### 5. Upload
**With SSH** (hPanel → Advanced → SSH Access; recommended), from your computer in the repository folder:
```bash
scp -P 65002 -r tools/hostinger-api/private  u123456789@YOUR-SERVER-IP:~/portfolio-api
scp -P 65002 -r tools/hostinger-api/public   u123456789@YOUR-SERVER-IP:~/domains/your-domain.com/public_html/api
```
(Use the port, username and IP shown on hPanel's SSH page.) Make sure the hidden `.htaccess` files arrive.

**With File Manager**: zip `private/` and `public/` on your computer → upload → extract so the folders end up exactly
as in the tree above. `portfolio-api` must be next to `domains/`, **not** inside `public_html`.

### 6. Configure (on the server only)
```bash
cd ~/portfolio-api && cp config.sample.php config.php && chmod 600 config.php && chmod 700 logs
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"     # run twice: one value for ip_salt, one for form_secret
php -r "echo password_hash('A-LONG-ADMIN-PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"   # → admin_password_hash
nano config.php
```
Fill in: `allowed_origins`, `smtp` (host `smtp.hostinger.com`, port `465` + `ssl`, or `587` + `tls`; username = the
full mailbox address; its password), `from_email` (the same mailbox), `owner_email` (where enquiries go), `brand`,
`turnstile_secret`, `db_*`, `ip_salt`, `form_secret`, `admin_password_hash`.
Leave `response_time` empty unless you want confirmations to promise one (e.g. `'within two working days'`).

### 7. Check the installation
- Open `https://your-domain.com/api/health` → every value should be `true` except `ai`.
  `"configured": false` means config.php still has template values (admin.php → Email tools lists which).
- Open `https://your-domain.com/api/admin.php` → sign in → **Email tools**:
  1. **Check SMTP connection** → must say *login succeeded*.
  2. **Send test email** to your own inbox, then to a Gmail address. Check inbox **and spam**.
  3. Optional but useful: send a test to the address shown on mail-tester.com and aim for 9/10 or better.
- Or over SSH: `php ~/portfolio-api/bin/send-test.php you@gmail.com --templates` (sends both real templates);
  add `--debug` to see the SMTP conversation (passwords are redacted).

### 8. Turn the forms on
In this repository edit `_data/forms.yml`:
```yaml
endpoint: "https://your-domain.com/api/"
turnstile_sitekey: "0x4AAAA…"        # the PUBLIC site key
```
Commit on a branch, open a pull request, merge. GitHub Pages rebuilds in a minute or two.
(For AI features also set `ai_key`/`ai_model` in config.php and, for the twin, `endpoint:` in `_data/twin.yml` to
`https://your-domain.com/api/twin`.)

### 9. Cron job (retries and clean-up)
hPanel → **Advanced → Cron Jobs** → every 15 minutes:
`/usr/bin/php /home/u123456789/portfolio-api/bin/maintain.php`
It resends any email that failed (up to 5 attempts over 3 days) and deletes submissions older than `retention_days`.

### 10. Go-live checklist — do this before calling it done
Delivery through Hostinger has **not** been tested yet (see “What was tested”). Please run each and tick it:
- [ ] `/api/health` all true · admin **Check SMTP connection** succeeds
- [ ] Home form (Website): notification arrives in your inbox; confirmation arrives at a Gmail address (not spam)
- [ ] Home form (Partnership) → subject says *Partnership request*
- [ ] AI page enquiry → *Consultation request*
- [ ] Solutions inquiry without a blueprint → *Project request*; with a blueprint → *AI Business Builder*
- [ ] Reply to a notification → the reply goes to the visitor (Reply-To)
- [ ] Reply to a confirmation (from the visitor's side) → it comes to your business inbox
- [ ] Same form sent twice quickly → only one notification
- [ ] On a phone (mobile data, not Wi-Fi) → a form sends and the confirmation arrives
- [ ] admin.php shows each submission with both emails **sent**

---

## Security, in short
- **Secrets** live only in `~/portfolio-api/config.php` (outside the web root, `chmod 600`) or in environment
  variables. Nothing secret is in JavaScript, GitHub or `public_html`. The health check warns if the private folder
  is ever placed inside the web root.
- **Origin + CSRF**: only origins in `allowed_origins` get CORS access; POSTs must be JSON (forces a preflight, so
  other sites can't post); each submission needs a token signed with `form_secret` for your origin, ≥ 3 s old
  (bots that submit instantly are refused) and ≤ 2 h old. The admin page uses a session CSRF token.
- **Cloudflare Turnstile** verified server-side for every submission (fails closed when required); hostname checked.
- **Validation** server-side for every field (lengths, email, phone, links); the browser's checks are a convenience only.
- **Header injection**: every header value is stripped of line breaks; addresses are validated twice (PHP and
  PHPMailer); the visitor's address is only ever a recipient or Reply-To — the sender is always your own mailbox.
- **Abuse of confirmations**: confirmations never repeat the visitor's free text, and names containing links or
  addresses are refused, so the form can't be used to send someone else spam. Limits: 5 per hour and 12 per day
  per visitor, 4 per day per email address.
- **Duplicates**: an idempotency key per form fill (double clicks, retries) plus “same person, same message within
  30 minutes” → the first reference is returned and nothing is re-sent.
- **Spam traps**: hidden honeypot field (bots get a fake success, nothing is stored or sent).
- **Privacy**: IP addresses are never stored (only a salted hash for rate limits); no user-agent or tracking;
  logs hold references, statuses and masked addresses (`k***@example.org`) — never message text or passwords;
  submissions are deleted after `retention_days`.
- **SMTP failures** never lose an enquiry: it is stored with `failed` status, the visitor isn't told a confirmation
  was sent, the cron job retries, and admin.php has a **Resend** button. If the database *and* SMTP are both down the
  visitor is told so and offered email/WhatsApp.
- **Admin**: password hash only, 15-minute lock after 8 wrong attempts, `noindex`, strict CSP, no framing,
  CSV export neutralises spreadsheet formulas.

## Updating later
Upload changed files over the old ones. **Never overwrite `config.php`** (it isn't in the repository, so a fresh copy
of `private/` won't contain it — upload the folder's contents, not a replacement folder). Logs rotate at 1 MB.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| `smtp_auth_failed` | Wrong mailbox password, or `smtp.username` isn't the full address |
| `smtp_connect_failed` | Try port 587 + `'tls'` instead of 465 + `'ssl'` (or the reverse) |
| `sender_rejected` | `from_email` isn't the mailbox you log in with |
| Confirmations in spam | SPF/DKIM/DMARC not set (step 1) |
| Form says “spam check didn't pass” | Turnstile hostname doesn't include the site's domain, or site/secret keys from different widgets |
| `/api/health` → `not_installed` | `portfolio-api` isn't in a parent folder of `public_html/api` |
| `/api/health` → `origin` errors in the browser console | `allowed_origins` must be exactly `https://rajdwaipyan.github.io` (no path, no trailing slash) |

Server-side details are in `~/portfolio-api/logs/app.log`.

## What was tested (locally, 17 November 2026)
Run with PHP 8.3 on PHP's built-in server **and on Apache with these `.htaccess` files**, SQLite, a real SMTP server
requiring a username and password, and a mock of Cloudflare's Turnstile verification:
- API: 50/50 — valid submissions (both emails, From/Reply-To, every field, plain-text parts), invalid email, empty
  fields, bad phone, missing consent, links in names, unknown form, header injection (CR/LF), honeypot, Turnstile
  fail/missing, too-fast/forged/foreign tokens, other-origin and non-JSON POSTs, idempotent and content duplicates,
  HTML escaping, hourly/daily/per-address rate limits.
- Failures: 12/12 — wrong SMTP password (stored, logged without the password, visitor not misled), retry by cron,
  database + SMTP down → 503, CLI test tool incl. password redaction.
- Admin page: 14/14 — login, CSRF, list, detail, resend, SMTP check, test email, status/notes, CSV, sign-out.
- Browser end-to-end: 48/48 on desktop and on a phone-sized touch screen — all three forms, double-click sends once,
  server-side errors shown on the right field, failed spam check and unreachable server fall back to email.
- With the API switched off, the existing page tests still pass (Solutions 101/101, AI page 152/152).

**Not yet tested: delivery through Hostinger's SMTP to real inboxes**, Cloudflare's real Turnstile widget and the
MySQL server on Hostinger. That needs your account — follow step 10.
