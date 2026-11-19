<?php
/**
 * GET: hands out a fresh ALTCHA proof-of-work challenge for the contact form.
 * The visitor's browser solves it in the background (~1 s), bots pay CPU time.
 */

declare(strict_types=1);

use AltchaOrg\Altcha\CreateChallengeOptions;

require __DIR__ . '/../server/src/bootstrap.php';

Http::requireMethod('GET');

if (!Http::isSameOrigin($config['allowed_origins'])) {
    Http::json(['ok' => false, 'error' => 'origin'], 403);
}

$p = $config['protection'];
$limiter = new RateLimiter(STORAGE_DIR . '/ratelimit');
[$max, $window] = $p['limit_challenges'];

if (!$limiter->hit('challenge', Http::clientKey($config['secrets']['ip_hash']), $max, $window)) {
    header('Retry-After: ' . $window);
    Http::json(['ok' => false, 'error' => 'rate'], 429);
}

$challenge = altcha($config)->createChallenge(new CreateChallengeOptions(
    algorithm: altcha_algorithm(),
    cost: (int) $p['pow_cost'],
    counter: random_int((int) $p['pow_counter_min'], (int) $p['pow_counter_max']),
    expiresAt: time() + (int) $p['challenge_ttl'],
    // Signed issue time + minimum fill time: lets us detect forms sent too fast.
    // 'mf' is also read by main.js, so a real visitor never runs into this check.
    data: ['iat' => time(), 'mf' => (int) $p['min_fill_seconds']],
));

Http::json($challenge->toArray());
