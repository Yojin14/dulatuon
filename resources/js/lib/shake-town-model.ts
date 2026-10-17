export interface Town {
    id: 'A' | 'B' | 'C' | 'D';
    /** Horizontal distance from the epicenter, in km. */
    distanceKm: number;
    /** Signed distance, so towns can sit on either side of the epicenter. */
    offsetKm: number;
    soft: boolean;
}

export const TOWNS: Town[] = [
    { id: 'A', distanceKm: 0, offsetKm: 0, soft: false },
    { id: 'B', distanceKm: 40, offsetKm: 40, soft: false },
    { id: 'C', distanceKm: 40, offsetKm: -40, soft: true },
    { id: 'D', distanceKm: 120, offsetKm: 120, soft: false },
];

export const MIN_MAGNITUDE = 4;
export const MAX_MAGNITUDE = 8;
export const MIN_DEPTH_KM = 5;
export const MAX_DEPTH_KM = 650;

/** PHIVOLCS Earthquake Intensity Scale descriptions, indexed by intensity. */
export const PEIS = [
    '',
    'Scarcely perceptible',
    'Slightly felt',
    'Weak',
    'Moderately strong',
    'Strong',
    'Very strong',
    'Destructive',
    'Very destructive',
    'Devastating',
    'Completely devastating',
];

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function roman(intensity: number): string {
    return ROMAN[intensity] ?? '';
}

/**
 * A deliberately simple classroom model, not a seismological one: intensity
 * rises with magnitude and falls with the straight-line distance from the
 * focus, and soft sediment adds one step.
 */
export function intensityAt(magnitude: number, depthKm: number, town: Town): number {
    const distance = Math.max(MIN_DEPTH_KM, Math.hypot(depthKm, town.distanceKm));
    const raw = 1.5 * magnitude - 3.5 * Math.log10(distance) + 3 + (town.soft ? 1 : 0);

    return Math.min(10, Math.max(1, Math.round(raw)));
}

export function intensities(magnitude: number, depthKm: number): number[] {
    return TOWNS.map((town) => intensityAt(magnitude, depthKm, town));
}

export function depthZone(depthKm: number): 'Shallow' | 'Intermediate' | 'Deep' {
    if (depthKm < 70) {
        return 'Shallow';
    }

    return depthKm <= 300 ? 'Intermediate' : 'Deep';
}

/** Map a 0–1 slider position to a depth on a log scale, snapped to tidy values. */
export function sliderToDepth(position: number): number {
    const raw = MIN_DEPTH_KM * Math.pow(MAX_DEPTH_KM / MIN_DEPTH_KM, position);
    const step = raw < 20 ? 1 : raw < 100 ? 5 : 10;

    return Math.min(MAX_DEPTH_KM, Math.max(MIN_DEPTH_KM, Math.round(raw / step) * step));
}

export function depthToSlider(depthKm: number): number {
    return Math.log(depthKm / MIN_DEPTH_KM) / Math.log(MAX_DEPTH_KM / MIN_DEPTH_KM);
}
