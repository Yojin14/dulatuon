/**
 * Installable app support: registers the service worker (production builds only) and keeps
 * the browser's "install" offer so a button can show it later.
 */

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event as InstallPromptEvent;
        emit();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        emit();
    });

    if (import.meta.env.DEV) {
        // A worker left over from a production build would serve stale files to the dev server.
        void navigator.serviceWorker
            .getRegistrations()
            .then((registrations) =>
                registrations.forEach(
                    (registration) => void registration.unregister(),
                ),
            );

        return;
    }

    const register = () =>
        void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register, { once: true });
    }
}

export function subscribeInstall(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function canPromptInstall(): boolean {
    return deferredPrompt !== null;
}

/** Shows the browser's install dialog. Resolves true when the user accepts. */
export async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) {
        return false;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    emit();
    await prompt.prompt();
    const choice = await prompt.userChoice;

    return choice.outcome === 'accepted';
}

export function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export function isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
