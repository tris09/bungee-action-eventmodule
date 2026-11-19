<?php

declare(strict_types=1);

/** Small HTTP helpers: JSON answers, method and origin checks, anonymous client key. */
final class Http
{
    /** Send a JSON answer and stop. */
    public static function json(array $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('X-Robots-Tag: noindex');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function requireMethod(string $method): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            header('Allow: ' . $method);
            self::json(['ok' => false, 'error' => 'method'], 405);
        }
    }

    /**
     * The request must come from our own page.
     * Browsers always send "Origin" with POST; simple bot scripts often don't.
     */
    public static function isSameOrigin(array $extraOrigins = []): bool
    {
        $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($origin !== '') {
            $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
            $originPort = parse_url($origin, PHP_URL_PORT);
            $originHostPort = $originHost . ($originPort ? ":$originPort" : '');
            return $originHostPort === $host || in_array(rtrim($origin, '/'), $extraOrigins, true);
        }

        // GET requests (challenge) usually carry no Origin: use Fetch Metadata instead
        $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
        return in_array($site, ['same-origin', 'none'], true);
    }

    /**
     * Anonymous key per visitor for rate limiting. The IP is never stored:
     * only a keyed hash of it. IPv6 is grouped by /64, which one household gets.
     */
    public static function clientKey(string $secret): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $packed = inet_pton($ip);
            $ip = bin2hex(substr($packed, 0, 8)) . '::/64';
        }
        return substr(hash_hmac('sha256', $ip, $secret), 0, 32);
    }
}
