import type { GroundConfig } from '@/lib/ground-test-model';

/** The 3D labs that have a looping preview. */
export type DemoGameType =
    | 'fault_lab'
    | 'shake_town'
    | 'wave_tank'
    | 'quake_tracker'
    | 'ground_test'
    | 'quake_ready';

export interface GameDemo {
    dispose: () => void;
}

/**
 * Plays a game's real 3D scene on a loop, like an arcade attract mode, so the
 * preview shows exactly what the student will play. Scenes load on demand.
 */
export async function startGameDemo(
    type: DemoGameType,
    container: HTMLElement,
): Promise<GameDemo> {
    const timers = new Set<number>();
    let stopped = false;
    const later = (ms: number, run: () => void): void => {
        const id = window.setTimeout(() => {
            timers.delete(id);
            if (!stopped) {
                run();
            }
        }, ms);
        timers.add(id);
    };
    const stop = (dispose: () => void): GameDemo => ({
        dispose: () => {
            stopped = true;
            timers.forEach((id) => window.clearTimeout(id));
            timers.clear();
            dispose();
        },
    });

    switch (type) {
        case 'shake_town': {
            const { ShakeTownScene } = await import('@/lib/shake-town-scene');
            const runs: [number, number][] = [
                [6.4, 12],
                [6.5, 250],
                [5.5, 8],
            ];
            let index = 0;
            const next = (): void => {
                const [magnitude, depthKm] = runs[index++ % runs.length];
                scene.reset();
                scene.setQuake(magnitude, depthKm);
                later(1200, () => scene.release());
            };
            const scene = new ShakeTownScene(container, {
                onDone: () => later(2600, next),
            });
            later(700, next);

            return stop(() => scene.dispose());
        }

        case 'wave_tank': {
            const { WaveTankScene } = await import('@/lib/wave-tank-scene');
            const runs = [
                { waves: ['P', 'S'] as const, liquid: false },
                { waves: ['Love', 'Rayleigh'] as const, liquid: false },
                { waves: ['P', 'S'] as const, liquid: true },
            ];
            let index = 0;
            const next = (): void => {
                const run = runs[index++ % runs.length];
                const wave = {
                    waves: [...run.waves],
                    liquid: run.liquid,
                    station: 1,
                };
                scene.configure(wave);
                later(900, () => scene.send(wave));
            };
            const scene = new WaveTankScene(
                container,
                document.createElement('canvas'),
                { onDone: () => later(1600, next) },
            );
            later(600, next);

            return stop(() => scene.dispose());
        }

        case 'fault_lab': {
            const { FaultLabScene } = await import('@/lib/fault-lab-scene');
            const kinds = ['push', 'pull', 'slide'] as const;
            let index = 0;
            const next = (): void => {
                scene.setExperiment(kinds[index++ % kinds.length]);
                later(900, () => scene.setPushing(true));
            };
            const scene = new FaultLabScene(container, {
                onStress: () => undefined,
                onSlip: () => undefined,
                onSettled: () => {
                    scene.setMarkers('points');
                    later(3200, next);
                },
            });
            later(600, next);

            return stop(() => scene.dispose());
        }

        case 'ground_test': {
            const { GroundTestScene } = await import('@/lib/ground-test-scene');
            const setups: GroundConfig[] = [
                {
                    slope: 2,
                    loose: false,
                    wet: false,
                    strong: true,
                    surfaceFault: false,
                },
                {
                    slope: 0,
                    loose: true,
                    wet: true,
                    strong: true,
                    surfaceFault: false,
                },
                {
                    slope: 1,
                    loose: false,
                    wet: false,
                    strong: true,
                    surfaceFault: true,
                },
            ];
            let index = 0;
            const next = (): void => {
                scene.setConfig(setups[index++ % setups.length]);
                later(1100, () => scene.shake());
            };
            const scene = new GroundTestScene(container, {
                onDone: () => later(2400, next),
            });
            later(600, next);

            return stop(() => scene.dispose());
        }

        case 'quake_ready': {
            const { QuakeReadyScene } = await import('@/lib/quake-ready-scene');
            const scene = new QuakeReadyScene(container, {
                onPick: () => undefined,
            });
            const loop = (): void => {
                scene.tidyUp();
                scene.studentStand();
                later(1500, () => scene.startShaking(5));
                later(2000, () => scene.studentDrop());
                later(2700, () => scene.studentCover());
                later(7600, loop);
            };
            later(500, loop);

            return stop(() => scene.dispose());
        }

        case 'quake_tracker': {
            const { CASES, QuakeTrackerScene } =
                await import('@/lib/quake-tracker-scene');
            const scene = new QuakeTrackerScene(container);
            scene.setLayers({ faults: true, pfz: true, trenches: true });
            const pinned = new Set<number>();
            let index = 0;
            const next = (): void => {
                const quake = index++ % CASES.length;
                scene.showCase(quake);
                later(1500, () => {
                    if (!pinned.has(quake)) {
                        pinned.add(quake);
                        scene.pinCase(quake);
                    }
                    scene.playAftershocks(quake, () => later(1400, next));
                });
            };
            later(800, next);

            return stop(() => scene.dispose());
        }
    }
}
