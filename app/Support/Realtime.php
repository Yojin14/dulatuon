<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Throwable;

class Realtime
{
    /**
     * Run a broadcast as a best-effort side-effect.
     *
     * Realtime delivery (Reverb / Pusher) must never break the core request:
     * if the broadcaster is unreachable, the failure is logged and swallowed
     * so the originating action (submitting work, sending a chat message,
     * requesting enrollment, etc.) still succeeds.
     */
    public static function dispatch(callable $broadcast): void
    {
        try {
            $broadcast();
        } catch (Throwable $e) {
            Log::warning('Realtime broadcast failed: '.$e->getMessage());
        }
    }
}
