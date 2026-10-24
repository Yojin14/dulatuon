import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { canUseWebGL, isLowPowerDevice } from '@/lib/device';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

/**
 * Live 3D diorama for hero spots, on phones too. three.js is loaded only on the
 * client and only while the hero is on screen. Reduced motion, no WebGL or a very
 * weak device get the static SVG block instead.
 */
export function HeroWorld({ className }: { className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || isLowPowerDevice() || !canUseWebGL()) {
            container.parentElement?.setAttribute('data-mode', 'static');

            return;
        }

        let scene: { dispose: () => void } | null = null;
        let cancelled = false;
        // Start downloading three.js straight away; the hero is usually on screen at load.
        const sceneModule = import('@/lib/hero-world-scene');
        sceneModule.catch(() => container.parentElement?.setAttribute('data-mode', 'static'));

        const mount = async () => {
            if (scene || cancelled) {
                return;
            }
            let HeroWorldScene: typeof import('@/lib/hero-world-scene').HeroWorldScene;
            try {
                ({ HeroWorldScene } = await sceneModule);
            } catch {
                container.parentElement?.setAttribute('data-mode', 'static');
                return;
            }
            if (cancelled || scene) {
                return;
            }
            scene = new HeroWorldScene(container);
            setIsLive(true);
        };
        const unmount = () => {
            scene?.dispose();
            scene = null;
        };

        const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? void mount() : unmount()), { rootMargin: '120px' });
        observer.observe(container);

        return () => {
            cancelled = true;
            observer.disconnect();
            unmount();
        };
    }, []);

    return (
        <div className={cn('group/hero relative', className)}>
            <div ref={containerRef} className={cn('absolute inset-0 transition-opacity duration-700', isLive ? 'opacity-100' : 'opacity-0')} />
            {!isLive && (
                <>
                    {/* While three.js loads: just the ground shadow the town will sit on, so nothing swaps in. */}
                    <div aria-hidden className="absolute inset-0 grid place-items-center group-data-[mode=static]/hero:hidden">
                        <div className="h-[14%] w-[55%] translate-y-[28%] animate-pulse rounded-[50%] bg-slate-900/10 blur-xl" />
                    </div>
                    {/* Devices that never get 3D see the drawn diorama instead. */}
                    <div className="absolute inset-0 hidden place-items-center p-6 group-data-[mode=static]/hero:grid">
                        <LowPolyBlock variant="quake" className="max-w-md drop-shadow-[0_24px_24px_rgba(85,48,28,0.3)]" />
                    </div>
                </>
            )}
        </div>
    );
}
