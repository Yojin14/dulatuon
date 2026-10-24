import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import {
    canPromptInstall,
    isIos,
    isStandalone,
    promptInstall,
    subscribeInstall,
} from '@/lib/pwa';
import { Download, Share, X } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

const DISMISS_KEY = 'dulatuon:install-dismissed';

function readDismissed(): boolean {
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * "Add Dulatuon to your home screen" card. Android and desktop Chrome get a one-tap install;
 * iPhones get the Share → Add to Home Screen steps. Hidden once installed or dismissed.
 */
export function InstallCard() {
    const installable = useSyncExternalStore(
        subscribeInstall,
        canPromptInstall,
        () => false,
    );
    const ios = useSyncExternalStore(
        () => () => undefined,
        () => isIos() && !isStandalone(),
        () => false,
    );
    const [dismissed, setDismissed] = useState(readDismissed);

    if (dismissed || (!installable && !ios)) {
        return null;
    }

    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            /* storage unavailable: hidden for this visit only */
        }
    };

    return (
        <section className="relative flex items-center gap-4 rounded-3xl border bg-card p-4 pr-12 shadow-panel sm:p-5 sm:pr-14">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 ring-1 ring-sky-200 dark:bg-white/10 dark:ring-white/10">
                <AppLogoIcon className="size-9" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-display font-bold">Get the Dulatuon app</p>
                {installable ? (
                    <p className="text-sm text-muted-foreground">
                        Open it from your home screen. Lessons you open stay
                        readable without signal.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Tap{' '}
                        <Share
                            className="inline size-4 align-text-bottom"
                            aria-label="Share"
                        />{' '}
                        then{' '}
                        <span className="font-semibold text-foreground">
                            Add to Home Screen
                        </span>
                        .
                    </p>
                )}
            </div>
            {installable && (
                <Button
                    size="sm"
                    className="shrink-0"
                    onClick={async () => {
                        if (await promptInstall()) {
                            dismiss();
                        }
                    }}
                >
                    <Download />
                    Install
                </Button>
            )}
            <button
                type="button"
                onClick={dismiss}
                className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
            >
                <X className="size-4" />
            </button>
        </section>
    );
}
