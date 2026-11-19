<?php

declare(strict_types=1);

/**
 * File based sliding-window rate limiter. No database needed, works on
 * every shared host. One small JSON file per bucket and visitor.
 */
final class RateLimiter
{
    public function __construct(private readonly string $dir)
    {
    }

    /**
     * Count one hit. Returns false when the visitor already reached $max hits
     * within the last $window seconds (the hit is then not counted).
     */
    public function hit(string $bucket, string $clientKey, int $max, int $window): bool
    {
        $file = $this->dir . '/' . $bucket . '-' . $clientKey . '.json';
        $now = time();

        $handle = fopen($file, 'c+');
        if ($handle === false) {
            error_log("RateLimiter: cannot open $file");
            return true; // fail open: a broken disk must not block real customers
        }

        try {
            flock($handle, LOCK_EX); // parallel requests wait here, so counts stay correct
            $raw = stream_get_contents($handle);
            $hits = json_decode($raw ?: '[]', true);
            $hits = array_values(array_filter(
                is_array($hits) ? $hits : [],
                static fn ($t) => is_int($t) && $t > $now - $window
            ));

            if (count($hits) >= $max) {
                return false;
            }

            $hits[] = $now;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($hits));
            return true;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
            $this->maybeCleanup();
        }
    }

    /** Now and then delete files nobody touched for a day. */
    private function maybeCleanup(): void
    {
        if (random_int(1, 50) !== 1) {
            return;
        }
        foreach (glob($this->dir . '/*.json') ?: [] as $file) {
            if (filemtime($file) < time() - 86400) {
                @unlink($file);
            }
        }
    }
}
