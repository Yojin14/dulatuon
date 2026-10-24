import { useCallback, useSyncExternalStore } from 'react';

function subscribe(notify: () => void): () => void {
    document.addEventListener('fullscreenchange', notify);

    return () => document.removeEventListener('fullscreenchange', notify);
}

/**
 * Page-level full screen. `enter()` must run inside a click or key handler, since browsers
 * only allow full screen from a user gesture; a refusal is ignored and the page carries on.
 * `supported` is false where the API is missing (iPhone Safari).
 */
export function useFullscreen() {
    const active = useSyncExternalStore(
        subscribe,
        () => document.fullscreenElement !== null,
        () => false,
    );
    const supported = useSyncExternalStore(
        () => () => {},
        () => Boolean(document.fullscreenEnabled),
        () => false,
    );

    const enter = useCallback(() => {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
        }
    }, []);

    const exit = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
        }
    }, []);

    const toggle = useCallback(() => (document.fullscreenElement ? exit() : enter()), [enter, exit]);

    return { supported, active, enter, exit, toggle };
}
