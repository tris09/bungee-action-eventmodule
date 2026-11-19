# bungee-action-eventmodule.de

One-pager (HTML, CSS, JS) with a small PHP backend for the contact form.

```
site/                  <- PUBLIC web root (the host's document root points here)
  index.html, impressum.html, datenschutz.html
  kontakt.php            <- receives the form, sends it via SMTP (PHPMailer)
  altcha-challenge.php   <- hands out spam-protection challenges
  .htaccess              <- bot blocking, security headers, caching (Apache)
  robots.txt
  css/ js/ fonts/ img/
  js/vendor/altcha.min.js  <- copied by "npm run vendor", do not edit
server/                <- PRIVATE, next to site/, never inside it
  config.example.php     <- template: copy to config.php and fill in
  config.php             <- secrets (git-ignored)
  src/                   <- form logic (rate limit, replay guard, mailer)
  storage/               <- runtime data: rate limits, logs (git-ignored)
  vendor/                <- PHP libraries from "composer install" (git-ignored)
composer.json          <- PHP libraries: phpmailer/phpmailer, altcha-org/altcha
package.json           <- dev tools: sharp (images), altcha (widget)
source-images/  brand/  tools/
```

## Contact form protection

| Layer | Where | Stops |
|---|---|---|
| User-agent and method rules | `site/.htaccess` | scripts, scrapers, SEO and AI-training crawlers, attack probes |
| Origin check | `kontakt.php` | posts from other websites or bare scripts |
| Honeypot field | `kontakt.php` | simple form bots (silently dropped) |
| Rate limit (hashed IP) | `server/src/RateLimiter.php` | floods: 5 enquiries/hour, 30 challenges/10 min |
| ALTCHA proof-of-work | `altcha-challenge.php`, `kontakt.php` | mass spam: each post costs CPU, no cookies, no third party |
| Single use | `server/src/ReplayGuard.php` | reusing one solved challenge |
| Minimum fill time | signed into the challenge | instant bot submissions |
| Content rules | `kontakt.php` | link spam, invalid data |

Limits and difficulty live in `server/config.php` → `protection`.

## Setup

Requirements: PHP 8.1+, Composer, Node.js 20+.

```
npm install          # dev tools + copies the ALTCHA widget to site/js/vendor
composer install     # PHPMailer + ALTCHA into server/vendor
cp server/config.example.php server/config.php   # then fill in SMTP + secrets
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;" # run 3x, one per secret
```

## Local testing

The `.htaccess` rules need Apache, so test with XAMPP (Apache + PHP) and catch mails with Mailpit:

1. XAMPP: point the document root to `site/` (or copy `site/` and `server/` side by side into `htdocs/`).
2. Mailpit: start it, SMTP runs on `127.0.0.1:1025`, the inbox on http://localhost:8025.
3. `server/config.php` → `smtp`: host `127.0.0.1`, port `1025`, encryption `''`, no username/password.

Without the `.htaccess` features, `php -S localhost:8000 -t site` also works.

## Deploy (shared hosting)

Upload `site/` as the web root and `server/` (including `vendor/` and `config.php`) one level above it.
Make `server/storage/` writable for PHP. Live SMTP: `encryption` `tls` (port 587) or `ssl` (465).
Once domain + SSL are active, enable the HTTPS block at the end of `site/.htaccess`.

## Responsive images

Put a photo into `source-images/`, then:

```
npm run images         # build new / changed photos
npm run images:force   # rebuild all
npm run images:clean   # also delete variants of removed photos
```

Output: `site/img/<slug>-<width>.avif|webp` (widths 400/800/1200/1600, never upscaled).

## Languages

German is the source text in the HTML. English, French and Dutch live in `site/js/i18n.js`
(`window.I18N` for page texts, `window.I18N_MESSAGES` for texts created by JS).
To add a language: add a dictionary with every key, add its code to `SUPPORTED_LANGS`
in `site/js/main.js` and an `<option>` to `#lang-select` in `site/index.html`.
