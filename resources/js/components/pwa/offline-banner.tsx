import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);

    return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
    };
}

/** A thin notice while the device has no connection. Lessons already opened keep working. */
export function OfflineBanner() {
    const online = useSyncExternalStore(
        subscribe,
        () => navigator.onLine,
        () => true,
    );

    if (online) {
        return null;
    }

    return (
        <div
            role="status"
            className="flex shrink-0 items-center justify-center gap-2 bg-slate-900 px-4 py-1.5 text-center text-xs font-semibold text-white dark:bg-slate-800"
        >
            <WifiOff className="size-3.5 shrink-0" aria-hidden />
            You're offline. Lessons you already opened still work.
        </div>
    );
}
