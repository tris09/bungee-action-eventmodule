<?php
/**
 * Shared setup for the public PHP endpoints in `site/`.
 *
 * Everything in `server/` lives OUTSIDE the web root, so visitors can never
 * download config, code or stored data directly.
 */

declare(strict_types=1);

use AltchaOrg\Altcha\Algorithm\Pbkdf2;
use AltchaOrg\Altcha\Altcha;

const APP_ROOT    = __DIR__ . '/..';
const STORAGE_DIR = APP_ROOT . '/storage';

// Never show PHP errors to visitors, log them privately instead
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', STORAGE_DIR . '/logs/php-error.log');
error_reporting(E_ALL);
date_default_timezone_set('Europe/Berlin');

foreach (['logs', 'ratelimit', 'altcha-used'] as $dir) {
    if (!is_dir(STORAGE_DIR . "/$dir")) {
        mkdir(STORAGE_DIR . "/$dir", 0750, true);
    }
}

require __DIR__ . '/Http.php';
require __DIR__ . '/RateLimiter.php';
require __DIR__ . '/ReplayGuard.php';
require __DIR__ . '/ContactMailer.php';

$autoload = APP_ROOT . '/vendor/autoload.php';
$configFile = APP_ROOT . '/config.php';

if (!is_file($autoload) || !is_file($configFile)) {
    error_log('Setup incomplete: run "composer install" and create server/config.php');
    Http::json(['ok' => false, 'error' => 'setup'], 500);
}

require $autoload;

/** @var array<string, mixed> $config */
$config = require $configFile;

foreach ($config['secrets'] as $name => $secret) {
    if (!is_string($secret) || strlen($secret) < 32 || str_starts_with($secret, 'CHANGE-ME')) {
        error_log("Secret '$name' in server/config.php is missing or too short");
        Http::json(['ok' => false, 'error' => 'setup'], 500);
    }
}

/** One place that builds the ALTCHA instance, so challenge and verification always match. */
function altcha(array $config): Altcha
{
    return new Altcha(
        hmacSignatureSecret: $config['secrets']['altcha_hmac'],
        hmacKeySignatureSecret: $config['secrets']['altcha_key'],
    );
}

function altcha_algorithm(): Pbkdf2
{
    return new Pbkdf2(); // PBKDF2/SHA-256, built into every modern browser
}
