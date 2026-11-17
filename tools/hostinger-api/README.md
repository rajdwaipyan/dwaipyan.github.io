# Business Solutions API (optional) — for Hostinger shared hosting

The portfolio itself stays on GitHub Pages, which cannot run server code. This small PHP + MySQL app adds the
parts that need a server. **Everything on /solutions/ already works without it** — this only adds:

| With this API | Without it (today) |
|---|---|
| "Send the brief" stores the enquiry, emails it to you and gives the client a reference | The client sends the brief from their own email app or WhatsApp, or copies/downloads it |
| An inbox at `admin.php`: list, read, set status, add notes, export CSV | Enquiries live in your email / WhatsApp only |
| Optional: each enquiry forwarded to an n8n or GoHighLevel inbound webhook | — |
| Optional AI: an internal proposal draft per enquiry (emailed to you only, prices left blank for you) | — |
| Optional AI: "Advisor notes" under a visitor's blueprint | The rule-based blueprint only |
| Optional AI: the digital twin answers with a language model (`/twin`) | The twin matches answers from the portfolio content |

It was tested locally (PHP 8.3, SQLite, a mock AI server) — **not yet on Hostinger and not with a real API key.**

## Why this fits Hostinger shared hosting
Shared hosting runs PHP and MySQL behind Apache, with `mail()` and cURL — that is all this app uses. No Node.js,
no background workers, no Composer packages. Each request finishes in one go (AI calls time out after 25 s).

## Set up (about 20 minutes)
1. **Subdomain.** In hPanel → Domains → Subdomains, create e.g. `api.edshieldsolutions.com` (use your real domain)
   on the ED Shield Solutions hosting plan. Turn on SSL for it (hPanel → Security → SSL).
2. **Database.** hPanel → Databases → MySQL: create a database and user. Note the names and password.
3. **Email sender.** hPanel → Emails: create `noreply@your-domain` (used as the From address).
4. **Upload.** Upload the contents of the `api/` folder into the subdomain's folder (File Manager or FTP).
5. **Configure.** Copy `config.sample.php` to `config.php` and fill it in:
   - `allowed_origins` — `https://rajdwaipyan.github.io`
   - `db_dsn`, `db_user`, `db_pass` — from step 2 (host is `localhost`)
   - `owner_email`, `from_email`
   - `admin_password_hash` — run `php -r "echo password_hash('a long password', PASSWORD_DEFAULT);"` and paste the result
   - `ip_salt` — any long random string
   - Optional: `webhook_url` (n8n / GoHighLevel inbound webhook), `ai_key` + `ai_model` (Anthropic API)
6. **Check.** Open `https://api.your-domain/health` — it should show `{"ok":true,...}`. The tables are created on
   first use. Then open `https://api.your-domain/config.php` — it must be **forbidden** (403).
7. **Connect the site.** In the portfolio repository set `api: "https://api.your-domain/"` in `_data/solutions.yml`
   (and, for the AI twin, `endpoint: "https://api.your-domain/twin"` in `_data/twin.yml`). Commit — GitHub Pages rebuilds.
8. **Test.** Send yourself an enquiry from /solutions/ and check the email, then `admin.php`.

## Security
- Only your site's origin may call the API (CORS check; other origins get 403).
- Limits per visitor per day (by a salted hash of the IP — IPs are never stored): 5 enquiries, 15 blueprint notes,
  60 twin questions. Change them in `limits`.
- Inputs are length-limited and stored with prepared statements; the admin page escapes everything, uses a
  session with CSRF tokens, and sends no-frame / no-sniff / strict CSP headers. CSV export neutralises formulas.
- A hidden "website" field catches simple spam bots.
- `config.php`, `lib.php` and SQLite files are blocked by `.htaccess`. Never commit `config.php` to GitHub.
- The AI is told never to state prices, timelines, revenue or guarantees; proposal drafts are for you only.

## Costs
- Hostinger: your existing plan (a subdomain and a MySQL database are included on most plans).
- Anthropic API: pay per use, only if you set `ai_key`. Set a monthly spending limit in the Anthropic console.
- n8n / GoHighLevel: your existing accounts, only if you set `webhook_url`.
