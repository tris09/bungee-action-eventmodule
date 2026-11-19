<?php

declare(strict_types=1);

/**
 * Makes sure every solved ALTCHA challenge can be used only once.
 * Without this, a bot could solve one challenge and reuse it for many posts.
 */
final class ReplayGuard
{
    public function __construct(private readonly string $dir)
    {
    }

    /**
     * Remember the challenge until it expires anyway.
     * Returns false when it was already used.
     */
    public function useOnce(string $challengeSignature, int $expiresAt): bool
    {
        $file = $this->dir . '/' . hash('sha256', $challengeSignature);

        // 'x' mode creates the file only if it does not exist yet: atomic, no race condition
        $handle = @fopen($file, 'x');
        if ($handle === false) {
            return false;
        }
        fclose($handle);
        touch($file, max($expiresAt, time()));

        $this->maybeCleanup();
        return true;
    }

    private function maybeCleanup(): void
    {
        if (random_int(1, 50) !== 1) {
            return;
        }
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            if (filemtime($file) < time() - 60) { // mtime = expiry time
                @unlink($file);
            }
        }
    }
}
