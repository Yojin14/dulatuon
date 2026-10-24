/** Very weak devices (2 cores or under 2 GB RAM) keep static artwork instead of live 3D. */
export function isLowPowerDevice(): boolean {
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory =
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

    return cores <= 2 || memory < 2;
}

export function canUseWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');

        return Boolean(
            canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
        );
    } catch {
        return false;
    }
}

export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
