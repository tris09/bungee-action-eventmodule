<?php
/**
 * POST: receives the contact form and mails it via SMTP (PHPMailer).
 *
 * Protection layers, cheapest first:
 *  1. Only POST from our own page (Origin check)
 *  2. Honeypot field: bots fill it, people never see it
 *  3. Rate limit per visitor (hashed IP, nothing personal stored)
 *  4. ALTCHA proof-of-work: valid, not expired, used only once
 *  5. Minimum fill time (signed into the challenge)
 *  6. Strict validation + simple content checks (links, length)
 *
 * Answers with JSON: {ok: true} or {ok: false, error: "<code>"}.
 */

declare(strict_types=1);

use AltchaOrg\Altcha\VerifySolutionOptions;

require __DIR__ . '/../server/src/bootstrap.php';

Http::requireMethod('POST');

if (!Http::isSameOrigin($config['allowed_origins'])) {
    Http::json(['ok' => false, 'error' => 'origin'], 403);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32 * 1024) {
    Http::json(['ok' => false, 'error' => 'too_long'], 413);
}

$p = $config['protection'];

// ---------- 2. Honeypot: pretend success, silently drop ----------
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    Http::json(['ok' => true]);
}

// ---------- 3. Rate limit ----------
$limiter = new RateLimiter(STORAGE_DIR . '/ratelimit');
[$max, $window] = $p['limit_submits'];
if (!$limiter->hit('submit', Http::clientKey($config['secrets']['ip_hash']), $max, $window)) {
    header('Retry-After: ' . $window);
    Http::json(['ok' => false, 'error' => 'rate'], 429);
}

// ---------- 4. ALTCHA proof-of-work ----------
$altchaField = $_POST['altcha'] ?? '';
$decoded = is_string($altchaField) ? json_decode((string) base64_decode($altchaField, true), true) : null;

if (!is_array($decoded) || !isset($decoded['challenge']['signature'])) {
    Http::json(['ok' => false, 'error' => 'captcha'], 400);
}

try {
    $result = altcha($config)->verifySolution(new VerifySolutionOptions(
        algorithm: altcha_algorithm(),
        payload: $decoded,
    ));
} catch (\Throwable $e) {
    Http::json(['ok' => false, 'error' => 'captcha'], 400);
}

if (!$result->verified) {
    Http::json(['ok' => false, 'error' => $result->expired ? 'captcha_expired' : 'captcha'], 400);
}

// Signature is valid from here on, so the parameters below can be trusted
$params = $decoded['challenge']['parameters'];
$guard = new ReplayGuard(STORAGE_DIR . '/altcha-used');
if (!$guard->useOnce($decoded['challenge']['signature'], (int) ($params['expiresAt'] ?? time() + 3600))) {
    Http::json(['ok' => false, 'error' => 'captcha'], 400);
}

// ---------- 5. Minimum fill time ----------
$issuedAt = (int) ($params['data']['iat'] ?? 0);
if ($issuedAt === 0 || time() - $issuedAt < (int) $p['min_fill_seconds']) {
    Http::json(['ok' => false, 'error' => 'too_fast'], 400);
}

// ---------- 6. Read & validate input ----------
/** One line of text: no tags, no line breaks, limited length. */
$line = static function (string $key, int $max = 200): string {
    $value = trim(strip_tags((string) ($_POST[$key] ?? '')));
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    return mb_substr($value, 0, $max);
};

$data = [
    'name'         => $line('name'),
    'organisation' => $line('organisation'),
    'email'        => $line('email', 254),
    'phone'        => $line('phone', 50),
    'event'        => $line('event'),
    'date'         => $line('date', 100),
    'place'        => $line('place'),
    'lang'         => in_array($_POST['lang'] ?? '', ['de', 'en', 'fr', 'nl'], true) ? $_POST['lang'] : 'de',
    'message'      => trim(strip_tags(str_replace("\r\n", "\n", (string) ($_POST['message'] ?? '')))),
];

$allowedInterests = ['Bungee-Trampolin', 'Hüpfburgen', 'Piratenschiff XXL', 'Kletterberg', 'Sonstiges'];
$data['interests'] = implode(', ', array_intersect($allowedInterests, (array) ($_POST['interest'] ?? [])));

$consent = ($_POST['consent'] ?? '') === 'yes';

if (
    $data['name'] === ''
    || $data['message'] === ''
    || !$consent
    || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)
    || ($data['phone'] !== '' && !preg_match('/^[0-9 +()\/.-]{5,50}$/', $data['phone']))
) {
    Http::json(['ok' => false, 'error' => 'validation'], 422);
}

if (mb_strlen($data['message']) > 5000) {
    Http::json(['ok' => false, 'error' => 'too_long'], 422);
}

// Typical spam: many links, or links in the name field
$linkPattern = '~(https?://|www\.)~i';
if (
    preg_match_all($linkPattern, $data['message']) > (int) $p['max_links']
    || preg_match($linkPattern, $data['name'] . $data['organisation'])
) {
    Http::json(['ok' => false, 'error' => 'spam'], 422);
}

// ---------- Send ----------
$sent = (new ContactMailer($config))->send($data);

Http::json(['ok' => $sent, 'error' => $sent ? '' : 'mail'], $sent ? 200 : 502);
