import { Button } from '@/components/ui/button';
import { RotateCw, Smartphone } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

const PORTRAIT_PHONE = '(orientation: portrait) and (max-width: 767px)';

type LockableOrientation = ScreenOrientation & {
    lock?: (orientation: 'landscape') => Promise<void>;
    unlock?: () => void;
};

function subscribe(onChange: () => void): () => void {
    const query = window.matchMedia(PORTRAIT_PHONE);
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
}

/**
 * Covers the game on a phone held upright and asks for landscape. Browsers only
 * allow a page to rotate the screen itself while in fullscreen (and not at all
 * on iPhone), so the button tries that and otherwise the student turns the phone.
 */
export function RotatePrompt() {
    const portrait = useSyncExternalStore(
        subscribe,
        () => window.matchMedia(PORTRAIT_PHONE).matches,
        () => false,
    );
    const [autoRotateFailed, setAutoRotateFailed] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        return () => {
            (screen.orientation as LockableOrientation | undefined)?.unlock?.();
            if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => undefined);
            }
        };
    }, []);

    if (!portrait || dismissed) {
        return null;
    }

    const rotate = async () => {
        try {
            await document.documentElement.requestFullscreen();
            const orientation = screen.orientation as LockableOrientation;
            if (!orientation.lock) {
                throw new Error('Orientation lock is not supported');
            }
            await orientation.lock('landscape');
        } catch {
            if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => undefined);
            }
            setAutoRotateFailed(true);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rotate-prompt-title"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-950/95 px-8 text-center"
        >
            <Smartphone className="h-16 w-16 animate-[spin_2.4s_ease-in-out_infinite] text-violet-300 motion-reduce:animate-none" />
            <div>
                <h2 id="rotate-prompt-title" className="text-xl font-extrabold text-white">
                    Turn your phone sideways
                </h2>
                <p className="mt-2 text-sm text-white/70">This simulation needs a wide screen so you can see the whole scene.</p>
            </div>

            {autoRotateFailed ? (
                <>
                    <p className="text-sm text-amber-200">
                        This browser cannot rotate the screen for you. Turn off rotation lock, then turn your phone sideways.
                    </p>
                    <button type="button" onClick={() => setDismissed(true)} className="text-xs font-semibold text-white/50 underline">
                        Continue upright anyway
                    </button>
                </>
            ) : (
                <Button onClick={rotate} className="h-11 bg-violet-600 px-6 font-bold text-white hover:bg-violet-700">
                    <RotateCw className="h-4 w-4" />
                    Rotate for me
                </Button>
            )}
        </div>
    );
}
