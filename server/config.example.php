<?php
/**
 * Configuration template.
 *
 * Copy this file to `config.php` (same folder) and fill in the values.
 * `config.php` holds secrets: it is ignored by git and must never be
 * placed inside the public web folder (`site/`).
 *
 * Generate the three secrets with:
 *   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 */

return [
    // ---------- Who receives the enquiries ----------
    'mail' => [
        'to'        => 'info@bungee-action.de',
        // Must be an address on the sending domain (SPF/DKIM), otherwise mails land in spam
        'from'      => 'website@bungee-action-eventmodule.de',
        'from_name' => 'Bungee Action Website',
        'subject'   => 'Neue Anfrage über bungee-action-eventmodule.de',
    ],

    // ---------- SMTP account (from the mail hoster) ----------
    // Local testing with Mailpit: host 127.0.0.1, port 1025, encryption '', no username/password.
    'smtp' => [
        'host'       => '127.0.0.1',
        'port'       => 1025,
        'encryption' => '',          // 'tls' = STARTTLS (port 587), 'ssl' = SMTPS (port 465), '' = none (local only!)
        'username'   => '',
        'password'   => '',
        'timeout'    => 15,
    ],

    // ---------- Secrets (one long random value each, never reuse) ----------
    'secrets' => [
        'altcha_hmac'     => 'CHANGE-ME-64-HEX-CHARS',
        'altcha_key'      => 'CHANGE-ME-64-HEX-CHARS',
        'ip_hash'         => 'CHANGE-ME-64-HEX-CHARS',
    ],

    // ---------- Spam protection ----------
    'protection' => [
        // Proof-of-work difficulty: work ≈ cost × counter. Aim for ~1 s on a mid-range phone.
        'pow_cost'          => 5000,
        'pow_counter_min'   => 30,
        'pow_counter_max'   => 90,
        'challenge_ttl'     => 1200,  // seconds a challenge stays valid (20 min to fill the form)
        'min_fill_seconds'  => 4,     // faster than this = bot
        'max_links'         => 3,     // more URLs in the message = spam
        'limit_submits'     => [5, 3600],   // max 5 enquiries per hour and IP
        'limit_challenges'  => [30, 600],   // max 30 challenges per 10 minutes and IP
    ],

    // Extra allowed origins for the form, e.g. 'https://www.example.de'.
    // Empty = only the host the page is served from.
    'allowed_origins' => [],

    // true only on your own PC: shows error details in the PHP error log
    'debug' => false,
];
