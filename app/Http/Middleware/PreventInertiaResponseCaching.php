<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventInertiaResponseCaching
{
    /**
     * Handle an incoming request.
     *
     * Inertia XHR responses return the raw page object as JSON. If a browser's
     * back/forward cache (common on mobile and after idle) or an upstream proxy
     * stores that payload, a later document navigation can render it as raw JSON.
     * Marking these responses as non-storable prevents that.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->headers->has('X-Inertia') || $response->headers->has('X-Inertia')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }
}
